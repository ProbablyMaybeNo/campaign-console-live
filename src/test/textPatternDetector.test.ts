import { describe, it, expect } from 'vitest';
import { analyzeText, toTableConfig, toCardConfig } from '@/lib/textPatternDetector';

describe('textPatternDetector', () => {
  describe('analyzeText', () => {
    describe('dice roll tables', () => {
      it('detects D6 roll tables with high confidence', () => {
        const text = `Random Events
1 - Nothing happens
2 - A stranger appears
3 - Storm brewing
4 - Wild animals
5 - Hidden treasure
6 - Enemy ambush`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('dice-table');
        expect(result.bestMatch?.diceType).toBe('d6');
        expect(result.bestMatch?.rows.length).toBe(6);
      });

      it('detects D66 roll tables', () => {
        const text = `D66 Encounter Table
11 - Goblins
12 - Orcs
13 - Trolls
21 - Wolves
22 - Bears
23 - Spiders`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        // Should detect as dice table with d66
        if (result.bestMatch?.type === 'dice-table') {
          expect(result.bestMatch.diceType).toBe('d66');
        }
      });

      it('detects 2D6 roll tables', () => {
        const text = `2D6 Result Table
2 - Critical failure
3 - Bad outcome
4 - Minor setback
5 - Neutral
6 - Slight advantage
7 - Normal success
8 - Good result
9 - Great success
10 - Excellent
11 - Outstanding
12 - Critical success`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.rows.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('TSV detection', () => {
      it('detects tab-separated values with headers', () => {
        const text = `Name\tCost\tWeight
Sword\t50gp\t3lb
Shield\t25gp\t5lb
Helmet\t15gp\t2lb
Chainmail\t100gp\t40lb
Boots\t10gp\t1lb`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('tsv');
        expect(result.bestMatch?.columns).toEqual(['Name', 'Cost', 'Weight']);
        expect(result.bestMatch?.rows.length).toBe(5);
        expect(result.bestMatch?.confidence).toBe('high');
      });

      it('handles TSV without clear headers', () => {
        const text = `Item1\tValue1\tNote1
Item2\tValue2\tNote2
Item3\tValue3\tNote3`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        // Should still parse even with ambiguous headers
        expect(result.bestMatch?.rows.length).toBeGreaterThanOrEqual(2);
      });

      it('returns medium confidence for small TSV', () => {
        const text = `Col1\tCol2
A\tB
C\tD`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.confidence).toBe('medium');
      });
    });

    describe('CSV detection', () => {
      it('detects comma-separated values with headers', () => {
        const text = `Name,Cost,Weight
Sword,50gp,3lb
Shield,25gp,5lb
Helmet,15gp,2lb
Chainmail,100gp,40lb
Boots,10gp,1lb`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('csv');
        expect(result.bestMatch?.columns).toEqual(['Name', 'Cost', 'Weight']);
        expect(result.bestMatch?.rows.length).toBe(5);
        expect(result.bestMatch?.confidence).toBe('high');
      });

      it('handles quoted fields with commas inside', () => {
        const text = `Name,Description,Price
"Sword, Long","A long sword, very sharp",50gp
"Shield, Round","A round shield, sturdy",25gp
Helmet,A simple helmet,15gp`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('csv');
        expect(result.bestMatch?.rows[0][0]).toBe('Sword, Long');
        expect(result.bestMatch?.rows[0][1]).toBe('A long sword, very sharp');
      });

      it('handles escaped quotes in CSV', () => {
        const text = `Name,Quote
Item1,"He said ""hello"""
Item2,"Normal text"`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('csv');
        expect(result.bestMatch?.rows[0][1]).toBe('He said "hello"');
      });

      it('returns medium confidence for small CSV', () => {
        const text = `Col1,Col2
A,B
C,D`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('csv');
        expect(result.bestMatch?.confidence).toBe('medium');
      });

      it('prefers TSV over CSV when tabs present', () => {
        const text = `Name\tCost\tWeight
Sword\t50gp\t3lb
Shield\t25gp\t5lb`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('tsv');
      });
    });

    describe('key-value detection', () => {
      it('detects key: value patterns', () => {
        const text = `Name: Iron Sword
Damage: 2d6+3
Weight: 3 lbs
Value: 50 gold
Type: Melee Weapon
Range: 5 feet`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('key-value');
        expect(result.bestMatch?.columns).toEqual(['Property', 'Value']);
        expect(result.bestMatch?.rows.length).toBe(6);
        expect(result.bestMatch?.rows[0]).toEqual(['Name', 'Iron Sword']);
      });

      it('returns high confidence for many key-value pairs', () => {
        const text = `Stat1: Value1
Stat2: Value2
Stat3: Value3
Stat4: Value4
Stat5: Value5`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('key-value');
        expect(result.bestMatch?.confidence).toBe('high');
      });

      it('returns medium confidence for few key-value pairs', () => {
        const text = `Key1: Val1
Key2: Val2
Key3: Val3`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.confidence).toBe('medium');
      });
    });

    describe('pipe/markdown tables', () => {
      it('detects markdown pipe tables', () => {
        const text = `| Name | Cost | Weight |
|------|------|--------|
| Sword | 50gp | 3lb |
| Shield | 25gp | 5lb |
| Helmet | 15gp | 2lb |`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('pipe-table');
        expect(result.bestMatch?.columns.length).toBe(3);
      });
    });

    describe('whitespace-aligned tables', () => {
      it('detects fixed-width column tables', () => {
        const text = `UNIT           COST    STATS
Infantry       10      M4 WS3 BS3
Cavalry        25      M8 WS4 BS2
Artillery      50      M2 WS2 BS4
Commander      100     M5 WS5 BS4`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.rows.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('fallback line detection', () => {
      it('falls back to line-by-line when no structure detected', () => {
        const text = `This is just a list of items
Another random line here
Some more content
Final line`;

        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('lines');
        expect(result.bestMatch?.confidence).toBe('low');
        expect(result.bestMatch?.columns).toEqual(['Content']);
        expect(result.bestMatch?.rows.length).toBe(4);
      });
    });

    describe('limits and truncation', () => {
      it('truncates text over 60000 characters', () => {
        const longText = 'A'.repeat(70000);
        const result = analyzeText(longText);
        
        expect(result.truncated).toBe(true);
        expect(result.rawCharCount).toBe(70000);
        expect(result.bestMatch?.warnings).toContain(
          expect.stringContaining('truncated')
        );
      });

      it('limits rows to 300', () => {
        // Create 400 TSV rows
        const rows = Array.from({ length: 400 }, (_, i) => `Item${i}\tValue${i}`);
        const text = `Name\tValue\n${rows.join('\n')}`;
        
        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.rows.length).toBeLessThanOrEqual(300);
        expect(result.bestMatch?.warnings).toContain(
          expect.stringContaining('limited to 300')
        );
      });

      it('limits columns to 25', () => {
        // Create TSV with 30 columns
        const header = Array.from({ length: 30 }, (_, i) => `Col${i}`).join('\t');
        const row = Array.from({ length: 30 }, (_, i) => `Val${i}`).join('\t');
        const text = `${header}\n${row}\n${row}\n${row}`;
        
        const result = analyzeText(text);
        
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.columns.length).toBeLessThanOrEqual(25);
        expect(result.bestMatch?.warnings).toContain(
          expect.stringContaining('limited to 25')
        );
      });
    });

    describe('edge cases', () => {
      it('handles empty text', () => {
        const result = analyzeText('');
        expect(result.bestMatch).toBeNull();
        expect(result.detections.length).toBe(0);
      });

      it('handles whitespace-only text', () => {
        const result = analyzeText('   \n\t\n   ');
        expect(result.bestMatch).toBeNull();
      });

      it('handles single line', () => {
        const result = analyzeText('Just one line');
        expect(result.bestMatch).not.toBeNull();
        expect(result.bestMatch?.type).toBe('lines');
      });
    });
  });

  describe('toTableConfig', () => {
    it('converts detection to table component config', () => {
      const text = `Name\tCost
Sword\t50gp
Shield\t25gp`;
      
      const result = analyzeText(text);
      expect(result.bestMatch).not.toBeNull();
      
      const config = toTableConfig(result.bestMatch!);
      
      expect(config.columns).toEqual(['Name', 'Cost']);
      expect(config.rows.length).toBe(2);
      expect(config.rows[0]).toHaveProperty('id');
      expect(config.rows[0].Name).toBe('Sword');
      expect(config.rows[0].Cost).toBe('50gp');
      expect(config.parsingMode).toBe('auto');
      expect(config.rawText).toBe(text);
    });
  });

  describe('toCardConfig', () => {
    it('converts key-value detection to card sections', () => {
      const text = `Name: Iron Sword
Damage: 2d6+3
Weight: 3 lbs`;
      
      const result = analyzeText(text);
      expect(result.bestMatch).not.toBeNull();
      
      const config = toCardConfig(result.bestMatch!);
      
      expect(config.sections.length).toBe(3);
      expect(config.sections[0].header).toBe('Name');
      expect(config.sections[0].content).toBe('Iron Sword');
      expect(config.parsingMode).toBe('auto');
    });

    it('converts table detection to single section', () => {
      const text = `Name\tCost
Sword\t50gp
Shield\t25gp`;
      
      const result = analyzeText(text);
      expect(result.bestMatch).not.toBeNull();
      
      const config = toCardConfig(result.bestMatch!);
      
      // Table types become a single section with formatted content
      expect(config.sections.length).toBe(1);
      expect(config.sections[0].content).toContain('Sword');
    });
  });
});
