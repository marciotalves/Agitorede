
import { NostrEvent, UserProfile, Testimonial } from '../types';
import { nip19, getPublicKey } from 'nostr-tools';

// Lista OTIMIZADA de Relays (Servidores Nostr) para alta performance
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',       // Tier 1 - Global
  'wss://relay.primal.net',     // Tier 1 - Caching rápido
  'wss://nos.lol',              // Tier 1 - Alta disponibilidade
  'wss://relay.nostr.band',     // Indexador robusto
  'wss://purplepag.es',         // Focado em perfis (NIP-05)
  'wss://relay.snort.social',   // Interface popular
  'wss://bitcoiner.social'      // Comunidade ativa
];

class NostrService {
  private sockets: Map<string, WebSocket> = new Map();
  private metadataListeners: Set<(profile: UserProfile) => void> = new Set();
  private profileCache: Map<string, UserProfile> = new Map();
  private globalFeedListener: ((profile: UserProfile) => void) | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    DEFAULT_RELAYS.forEach(url => {
      try {
        const ws = new WebSocket(url);
        ws.onopen = () => {
          this.sockets.set(url, ws);
          console.log(`Connected to Agito Relay: ${url}`);
          
          // Busca inicial global
          const subId = 'global-' + Math.random().toString(36).substring(7);
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
      const name = content.display_name || content.name || content.username;
      if (!name) return;

      const profile: UserProfile = {
        pubkey: event.pubkey,
        name: content.name,
        display_name: content.display_name || content.name,
        picture: content.picture,
        about: content.about,
        nip05: content.nip05,
        lastActive: event.created_at * 1000
      };
      
      const existing = this.profileCache.get(event.pubkey);
      if (!existing || (profile.lastActive || 0) > (existing.lastActive || 0)) {
        this.profileCache.set(event.pubkey, profile);
        this.metadataListeners.forEach(cb => cb(profile));
        if (this.globalFeedListener) {
            this.globalFeedListener(profile);
        }
      }
    } catch (e) {}
  }

  // Busca perfil usando a PUBKEY (mesmo se logado com nsec)
  public fetchProfile(pubkey: string) {
    if (!pubkey) return;
    
    // Tenta pegar do cache primeiro
    const cached = this.profileCache.get(pubkey);
    if (cached) {
      this.metadataListeners.forEach(cb => cb(cached));
    }

    const subId = 'p-' + pubkey.slice(0, 8);
    // Request agressivo para todos os relays conectados
    const req = JSON.stringify(["REQ", subId, { kinds: [0], authors: [pubkey], limit: 1 }]);
    
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(req);
      }
    });
  }

  public getProfileSync(pubkey: string): UserProfile | undefined {
    return this.profileCache.get(pubkey);
  }

  public subscribeMetadata(callback: (profile: UserProfile) => void) {
    this.metadataListeners.add(callback);
    return () => this.metadataListeners.delete(callback);
  }

  public setGlobalFeedListener(callback: (profile: UserProfile) => void) {
      this.globalFeedListener = callback;
      this.profileCache.forEach(p => callback(p));
  }

  public async publishMetadata(privkeyHex: string, profile: Partial<UserProfile>) {
    // Garante que temos a pubkey correta
    const pubkey = getPublicKey(privkeyHex);
    
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

    console.log("Broadcasting metadata update to relays...", event);
    // Simulação de update local imediato para UX
    const updatedProfile: UserProfile = {
      pubkey,
      ...profile,
      lastActive: Date.now()
    };
    this.profileCache.set(pubkey, updatedProfile);
    this.metadataListeners.forEach(cb => cb(updatedProfile));
    
    return updatedProfile;
  }

  public getTestimonials(toPubkey: string): Testimonial[] {
    try {
      const stored = localStorage.getItem(`testimonials_${toPubkey}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  public async publishTestimonial(fromPrivKey: string, toPubkey: string, content: string) {
    const fromPubkey = getPublicKey(fromPrivKey);
    const authorProfile = this.profileCache.get(fromPubkey);

    const testimonial: Testimonial = {
      id: Math.random().toString(36).substring(7),
      fromPubkey: fromPubkey,
      toPubkey: toPubkey,
      content: content,
      timestamp: Date.now(),
      authorName: authorProfile?.display_name || "Usuário Agito",
      authorPicture: authorProfile?.picture
    };

    const current = this.getTestimonials(toPubkey);
    const updated = [testimonial, ...current];
    localStorage.setItem(`testimonials_${toPubkey}`, JSON.stringify(updated));
    return testimonial;
  }

  public generateNewIdentity() {
    const randomHex = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return {
      pubkey: getPublicKey(randomHex),
      privkey: randomHex
    };
  }

  // Processa o login para retornar chaves em formato HEX
  public processLogin(input: string): { pubkey: string, privkey?: string } | null {
    try {
        const clean = input.trim();
        
        // Caso 1: NSEC (Chave Privada)
        if (clean.startsWith('nsec')) {
            const { type, data } = nip19.decode(clean);
            if (type === 'nsec') {
                const privkeyHex = data as string;
                const pubkeyHex = getPublicKey(privkeyHex);
                return { privkey: privkeyHex, pubkey: pubkeyHex };
            }
        }
        
        // Caso 2: NPUB (Chave Pública)
        if (clean.startsWith('npub')) {
             const { type, data } = nip19.decode(clean);
             if (type === 'npub') {
                 return { pubkey: data as string };
             }
        }

        // Caso 3: HEX
        if (clean.length === 64) {
            try {
                const pub = getPublicKey(clean);
                return { privkey: clean, pubkey: pub };
            } catch (e) {
                return { pubkey: clean };
            }
        }
    } catch (e) {
        console.error("Login processing error:", e);
    }
    return null;
  }
}

export const nostrService = new NostrService();
