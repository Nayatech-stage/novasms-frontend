import { describe, expect, it } from 'vitest';
import { RegisterSchema } from './validation';

describe('RegisterSchema — validation inscription (US-001)', () => {
  const valid = {
    nom: 'Awa Koné',
    email: 'awa@example.ci',
    motDePasse: 'motdepasse8',
    nomBoutique: 'Boutique Awa',
    pays: 'CI',
  };

  it('accepte un dossier complet valide', () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true);
  });

  it('rejette un email invalide', () => {
    const result = RegisterSchema.safeParse({ ...valid, email: 'pas-un-email' });

    expect(result.success).toBe(false);
  });

  it('rejette un mot de passe de moins de 8 caractères', () => {
    const result = RegisterSchema.safeParse({ ...valid, motDePasse: 'court' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8 caractères');
    }
  });

  it('exige nom, boutique et pays', () => {
    expect(RegisterSchema.safeParse({ ...valid, nom: 'A' }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...valid, nomBoutique: '' }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...valid, pays: '' }).success).toBe(false);
  });
});
