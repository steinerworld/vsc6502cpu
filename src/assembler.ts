type Instruction = {
  mnemonic: string;
  mode: string;
  bytes: number;
  opcode: number;
};

const opcodeTable: Instruction[] = [
  { mnemonic: 'LDA', mode: 'immediate',   opcode: 0xA9, bytes: 2 },
  { mnemonic: 'LDA', mode: 'zeropage',    opcode: 0xA5, bytes: 2 },
  { mnemonic: 'LDA', mode: 'zeropage,X',  opcode: 0xB5, bytes: 2 },
  { mnemonic: 'LDA', mode: 'absolute',    opcode: 0xAD, bytes: 3 },
  { mnemonic: 'LDA', mode: 'absolute,X',  opcode: 0xBD, bytes: 3 },
  { mnemonic: 'LDA', mode: 'absolute,Y',  opcode: 0xB9, bytes: 3 },
  { mnemonic: 'LDA', mode: '(indirect,X)',opcode: 0xA1, bytes: 2 },
  { mnemonic: 'LDA', mode: '(indirect),Y',opcode: 0xB1, bytes: 2 },
  // Weitere Instruktionen ergänzen ...
];

function getAddressingMode(arg: string): { mode: string, value: number } | null {
  if (arg.startsWith('#$')) return { mode: 'immediate', value: parseInt(arg.slice(2), 16) };
  if (/^\(\$[0-9A-F]{2},X\)$/i.test(arg)) return { mode: '(indirect,X)', value: parseInt(arg.slice(2, 4), 16) };
  if (/^\(\$[0-9A-F]{2}\),Y$/i.test(arg)) return { mode: '(indirect),Y', value: parseInt(arg.slice(2, 4), 16) };
  if (/^\$[0-9A-F]{2},X$/i.test(arg)) return { mode: 'zeropage,X', value: parseInt(arg.slice(1, 3), 16) };
  if (/^\$[0-9A-F]{4},X$/i.test(arg)) return { mode: 'absolute,X', value: parseInt(arg.slice(1, 5), 16) };
  if (/^\$[0-9A-F]{4},Y$/i.test(arg)) return { mode: 'absolute,Y', value: parseInt(arg.slice(1, 5), 16) };
  if (/^\$[0-9A-F]{2}$/i.test(arg)) return { mode: 'zeropage', value: parseInt(arg.slice(1, 3), 16) };
  if (/^\$[0-9A-F]{4}$/i.test(arg)) return { mode: 'absolute', value: parseInt(arg.slice(1, 5), 16) };
  return null;
}

export function assemble6502(source: string): Uint8Array {
  const lines = source.split(/\r?\n/);
  const output: number[] = [];
  const labels: Record<string, number> = {};
  const pending: { line: string, address: number }[] = [];

  let pc = 0x0600; // Default Startadresse (z.B. Apple II RAM)

  // First pass: Labels und Länge bestimmen
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith(';')) continue;

    const labelMatch = trimmed.match(/^([A-Za-z_][\w]*):$/);
    if (labelMatch) {
      labels[labelMatch[1]] = pc;
      continue;
    }

    const parts = trimmed.split(/\s+/, 2);
    const mnemonic = parts[0].toUpperCase();
    const arg = parts[1]?.trim() ?? '';

    const modeInfo = getAddressingMode(arg);
    const mode = modeInfo?.mode ?? 'unknown';

    const instr = opcodeTable.find(i => i.mnemonic === mnemonic && i.mode === mode);
    if (instr) {
      pc += instr.bytes;
    } else {
      // Label oder nicht erkannte Anweisung → später behandeln
      pending.push({ line: trimmed, address: pc });
      pc += 3; // Worst case reservieren
    }
  }

  pc = 0x0600;

  // Second pass: Ausgabe
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith(';')) continue;

    const labelMatch = trimmed.match(/^([A-Za-z_][\w]*):$/);
    if (labelMatch) continue;

    const parts = trimmed.split(/\s+/, 2);
    const mnemonic = parts[0].toUpperCase();
    const arg = parts[1]?.trim() ?? '';

    const modeInfo = getAddressingMode(arg);
    const mode = modeInfo?.mode ?? '';
    const value = modeInfo?.value;

    const instr = opcodeTable.find(i => i.mnemonic === mnemonic && i.mode === mode);
    if (instr && value !== undefined) {
      output.push(instr.opcode);
      if (instr.bytes === 2) {
        output.push(value & 0xFF);
      } else if (instr.bytes === 3) {
        output.push(value & 0xFF, value >> 8);
      }
      pc += instr.bytes;
    } else if (arg in labels) {
      // LDA LABEL
      const addr = labels[arg];
      output.push(0xAD); // LDA absolute
      output.push(addr & 0xFF, addr >> 8);
      pc += 3;
    } else {
      console.warn('Unbekannte Zeile:', line);
      output.push(0xEA); // NOP als Fallback
    }
  }

  return new Uint8Array(output);
}
