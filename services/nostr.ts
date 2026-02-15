
import { NostrEvent, UserProfile } from '../types';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://purplepag.es',
  'wss://relay.nostr.band'
];

class NostrService {
  private sockets: Map<string, WebSocket> = new Map();
  private metadataListeners: Set<(profile: UserProfile) => void> = new Set();
  private profileCache: Map<string, UserProfile> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    DEFAULT_RELAYS.forEach(url => {
      try {
        const ws = new WebSocket(url);
        ws.onopen = () => {
          this.sockets.set(url, ws);
          const subId = 'init-' + Math.random().toString(36).substring(7);
          ws.send(JSON.stringify(["REQ", subId, { kinds: [0], limit: 50 }]));
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data[0] === "EVENT" && data[2]) {
              const event = data[2] as NostrEvent;
              if (event.kind === 0) {
                this.handleMetadata(event);
              }
            }
          } catch (e) {}
        };
        ws.onerror = () => this.sockets.delete(url);
        ws.onclose = () => this.sockets.delete(url);
      } catch (err) {
        console.error(`Relay connection error: ${url}`);
      }
    });
  }

  private handleMetadata(event: NostrEvent) {
    try {
      const content = JSON.parse(event.content);
      const profile: UserProfile = {
        pubkey: event.pubkey,
        name: content.name || content.display_name,
        display_name: content.display_name || content.name || "Anon",
        picture: content.picture,
        about: content.about,
        lastActive: event.created_at * 1000
      };
      
      const existing = this.profileCache.get(event.pubkey);
      if (!existing || (profile.lastActive || 0) > (existing.lastActive || 0)) {
        this.profileCache.set(event.pubkey, profile);
        this.metadataListeners.forEach(cb => cb(profile));
      }
    } catch (e) {}
  }

  public fetchProfile(pubkey: string) {
    if (!pubkey) return;
    
    const subId = 'p-' + pubkey.slice(0, 8);
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["REQ", subId, { kinds: [0], authors: [pubkey], limit: 1 }]));
      }
    });

    const cached = this.profileCache.get(pubkey);
    if (cached) {
      this.metadataListeners.forEach(cb => cb(cached));
    }
  }

  public subscribeMetadata(callback: (profile: UserProfile) => void) {
    this.metadataListeners.add(callback);
    return () => this.metadataListeners.delete(callback);
  }

  /**
   * Simula a publicação de metadados no Nostr.
   * Em um ambiente de produção, isso exigiria a assinatura do evento com a chave privada (nsec).
   */
  public async publishMetadata(privkey: string, profile: Partial<UserProfile>) {
    // No Nostr real, transformaríamos a privkey em pubkey e assinaríamos um evento Kind 0
    const pubkey = privkey.startsWith('nsec') ? privkey.replace('nsec_agito_', '').slice(0, 64) : privkey;
    
    const event = {
      kind: 0,
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({
        name: profile.name,
        display_name: profile.display_name,
        picture: profile.picture,
        about: profile.about,
      })
    };

    // Simulando o envio para todos os relés
    console.log("Broadcasting Kind 0 to relays...", event);
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["EVENT", event]));
      }
    });

    // Atualiza cache local imediatamente
    const updatedProfile: UserProfile = {
      pubkey,
      ...profile,
      lastActive: Date.now()
    };
    this.profileCache.set(pubkey, updatedProfile);
    this.metadataListeners.forEach(cb => cb(updatedProfile));
    
    return updatedProfile;
  }

  public generateNewIdentity() {
    const randomHex = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return {
      pubkey: randomHex.slice(0, 64),
      privkey: 'nsec_agito_' + randomHex.slice(0, 32)
    };
  }

  public async tryDecode(input: string): Promise<string> {
    return input.replace('npub', '').replace('nsec', '').trim();
  }
}

export const nostrService = new NostrService();
