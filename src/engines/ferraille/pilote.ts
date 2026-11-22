/** Niveaux pilotes : relief généré par Sturgeon (MIT), modules et ennemis d'un niveau existant (base). */
export interface Pilote { nom: string; base: number; seed: number; rows: readonly string[] }
export const PILOTES: readonly Pilote[] = [
    { nom: "Pilote 1 — relief Sturgeon sur le niveau 2", base: 1, seed: 3, rows: [
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '-----------------------------------------------------------------------------------------------------PP---------',
        '-------------------------------------------------------------------PPPPPP---------------------------------------',
        '-------------------------------------PPPPPPPP--------------------PPP-----------------------------PPP------------',
        '-------------------XX--------------------------XXX-------------XXXX-----------------------------------XX--------',
        '-----------------XXXX-------------PP----------XXXX------------XXXXX---------------------------PP-----XXX--------',
        '-----------------XXXX------------------------XXXXX-----------XXXXXX---------------------------------XXXX--------',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXX------XXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ] },
    { nom: "Pilote 2 — relief Sturgeon sur le niveau 8", base: 7, seed: 5, rows: [
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '--------------------------------------------------PP--------------------------PP--------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '-----------------------------------------------PP--------------------------PP----------------------PP-----------',
        '------------------------------------------------------------------PP--------------------------------------------',
        '----------------------PP-------------PPPPPPPPP------------------------PPPP----------------------PP--------------',
        '---------------------------------------------------------------XX-----------------------------------------------',
        '------------------PPP-------------PP------------XX------------XXX--XX------------------------XX-----------------',
        '---------------PPPP------------------------------------------XXXX--XX---------------------------------PP--------',
        'XXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXX----XXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX---XXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX---XXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX---XXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX---XXXXXXXXXXXX',
    ] },
    { nom: "Pilote 3 — relief Sturgeon sur le niveau 13", base: 12, seed: 3, rows: [
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '-----------------------------------------------------------------------------------------------------PP---------',
        '-------------------------------------------------------------------PPPPPP---------------------------------------',
        '------------------PPPPPP-------------PPPPPPPP--------------------PPP-----------------------------PPP------------',
        '-----------------------------------------------XXX-------------XXXX-----------------------------------XX--------',
        '---------------XX-----------------PP----------XXXX------------XXXXX---------------------------PP-----XXX--------',
        '---------------------------------------------XXXXX-----------XXXXXX---------------------------------XXXX--------',
        'XXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXX------XXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ] },
    { nom: "Pilote 4 — relief Sturgeon sur le niveau 21", base: 20, seed: 3, rows: [
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '-----------------------------------------------------------------------------------------------------PP---------',
        '-------------------------------------------------------------------PPPPPP---------------------------------------',
        '-------------------------------------PPPPPPPP--------------------PPP-----------------------------PPP------------',
        '-------------------XX--------------------------XXX-------------XXXX-----------------------------------XX--------',
        '-----------------XXXX-------------PP----------XXXX------------XXXXX---------------------------PP-----XXX--------',
        '-----------------XXXX------------------------XXXXX-----------XXXXXX---------------------------------XXXX--------',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXX------XXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ] },
    { nom: "Pilote 5 — relief Sturgeon sur le niveau 24", base: 23, seed: 4, rows: [
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '----------------------------------------------------------------------------------------------------------------',
        '--------------------------------------------------------------------------PPPPP----------------------PPP--------',
        '----------------------------------------------------------------------------------------------------------------',
        '--------------------PPPP----------------------------------------------PPP-------------------------PP------------',
        '--------------------------------------PPPPPPPPPPP---------------------------------------------------------------',
        '-----------------XX------------------------------------------------PP--------------------------XX---------------',
        '----------------XXX----------------PP------------XX--------------------------XX---------------XXX---------------',
        '---------------XXXX------------------------------XX-------------XX---------------------------XXXX---PP----------',
        'XXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXX---XXXXXXXXXX--XXXXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXX-------XXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX----XXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXX',
    ] },
];
/** Relief retouché dans l'éditeur (pilote.html) : ?relief=<base64url de l'UTF-8 de {nom, base, seed, rows}>. */
export function reliefEdite(code: string | null): Pilote | undefined {
    if (!code) return undefined;
    try {
        const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))) as { nom?: unknown; base?: unknown; seed?: unknown; rows?: unknown };
        const { base, rows } = p;
        if (typeof base !== 'number' || !Number.isInteger(base) || base < 0 || base >= 30 || !Array.isArray(rows)) return undefined;
        const lignes = rows.filter((r): r is string => typeof r === 'string' && /^[-XP]{1,200}$/.test(r));
        if (lignes.length === 0 || lignes.length !== rows.length || lignes.length > 20) return undefined;
        return { nom: typeof p.nom === 'string' ? p.nom : 'retouché', base, seed: typeof p.seed === 'number' ? p.seed : 460, rows: lignes };
    } catch { return undefined; }
}
