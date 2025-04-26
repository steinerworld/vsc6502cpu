import * as vscode from 'vscode';

type Instruction = {
  mnemonic: string;
  mode: string;
  bytes: number;
  opcode: number;
};

const opcodeTable: Instruction[] = [
  // LDA
  { mnemonic: 'LDA', mode: 'immediate', opcode: 0xA9, bytes: 2 },
  { mnemonic: 'LDA', mode: 'zeropage', opcode: 0xA5, bytes: 2 },
  { mnemonic: 'LDA', mode: 'zeropage,X', opcode: 0xB5, bytes: 2 },
  { mnemonic: 'LDA', mode: 'absolute', opcode: 0xAD, bytes: 3 },
  { mnemonic: 'LDA', mode: 'absolute,X', opcode: 0xBD, bytes: 3 },
  { mnemonic: 'LDA', mode: 'absolute,Y', opcode: 0xB9, bytes: 3 },
  { mnemonic: 'LDA', mode: '(indirect,X)', opcode: 0xA1, bytes: 2 },
  { mnemonic: 'LDA', mode: '(indirect),Y', opcode: 0xB1, bytes: 2 },

  // STA
  { mnemonic: 'STA', mode: 'zeropage', opcode: 0x85, bytes: 2 },
  { mnemonic: 'STA', mode: 'zeropage,X', opcode: 0x95, bytes: 2 },
  { mnemonic: 'STA', mode: 'absolute', opcode: 0x8D, bytes: 3 },
  { mnemonic: 'STA', mode: 'absolute,X', opcode: 0x9D, bytes: 3 },
  { mnemonic: 'STA', mode: 'absolute,Y', opcode: 0x99, bytes: 3 },
  { mnemonic: 'STA', mode: '(indirect,X)', opcode: 0x81, bytes: 2 },
  { mnemonic: 'STA', mode: '(indirect),Y', opcode: 0x91, bytes: 2 },

  // CMP
  { mnemonic: 'CMP', mode: 'immediate', opcode: 0xC9, bytes: 2 },
  { mnemonic: 'CMP', mode: 'zeropage', opcode: 0xC5, bytes: 2 },
  { mnemonic: 'CMP', mode: 'zeropage,X', opcode: 0xD5, bytes: 2 },
  { mnemonic: 'CMP', mode: 'absolute', opcode: 0xCD, bytes: 3 },
  { mnemonic: 'CMP', mode: 'absolute,X', opcode: 0xDD, bytes: 3 },
  { mnemonic: 'CMP', mode: 'absolute,Y', opcode: 0xD9, bytes: 3 },
  { mnemonic: 'CMP', mode: '(indirect,X)', opcode: 0xC1, bytes: 2 },
  { mnemonic: 'CMP', mode: '(indirect),Y', opcode: 0xD1, bytes: 2 },

  // AND
  { mnemonic: 'AND', mode: 'immediate', opcode: 0x29, bytes: 2 },
  { mnemonic: 'AND', mode: 'zeropage', opcode: 0x25, bytes: 2 },
  { mnemonic: 'AND', mode: 'zeropage,X', opcode: 0x35, bytes: 2 },
  { mnemonic: 'AND', mode: 'absolute', opcode: 0x2D, bytes: 3 },
  { mnemonic: 'AND', mode: 'absolute,X', opcode: 0x3D, bytes: 3 },
  { mnemonic: 'AND', mode: 'absolute,Y', opcode: 0x39, bytes: 3 },
  { mnemonic: 'AND', mode: '(indirect,X)', opcode: 0x21, bytes: 2 },
  { mnemonic: 'AND', mode: '(indirect),Y', opcode: 0x31, bytes: 2 },

  // ORA
  { mnemonic: 'ORA', mode: 'immediate', opcode: 0x09, bytes: 2 },
  { mnemonic: 'ORA', mode: 'zeropage', opcode: 0x05, bytes: 2 },
  { mnemonic: 'ORA', mode: 'zeropage,X', opcode: 0x15, bytes: 2 },
  { mnemonic: 'ORA', mode: 'absolute', opcode: 0x0D, bytes: 3 },
  { mnemonic: 'ORA', mode: 'absolute,X', opcode: 0x1D, bytes: 3 },
  { mnemonic: 'ORA', mode: 'absolute,Y', opcode: 0x19, bytes: 3 },
  { mnemonic: 'ORA', mode: '(indirect,X)', opcode: 0x01, bytes: 2 },
  { mnemonic: 'ORA', mode: '(indirect),Y', opcode: 0x11, bytes: 2 },

  // EOR
  { mnemonic: 'EOR', mode: 'immediate', opcode: 0x49, bytes: 2 },
  { mnemonic: 'EOR', mode: 'zeropage', opcode: 0x45, bytes: 2 },
  { mnemonic: 'EOR', mode: 'zeropage,X', opcode: 0x55, bytes: 2 },
  { mnemonic: 'EOR', mode: 'absolute', opcode: 0x4D, bytes: 3 },
  { mnemonic: 'EOR', mode: 'absolute,X', opcode: 0x5D, bytes: 3 },
  { mnemonic: 'EOR', mode: 'absolute,Y', opcode: 0x59, bytes: 3 },
  { mnemonic: 'EOR', mode: '(indirect,X)', opcode: 0x41, bytes: 2 },
  { mnemonic: 'EOR', mode: '(indirect),Y', opcode: 0x51, bytes: 2 },

  // Sprünge und Subroutinen
  { mnemonic: 'JMP', mode: 'absolute', opcode: 0x4C, bytes: 3 },
  { mnemonic: 'JSR', mode: 'absolute', opcode: 0x20, bytes: 3 },
  { mnemonic: 'RTS', mode: 'implicit', opcode: 0x60, bytes: 1 },
  { mnemonic: 'CMP', mode: 'immediate', opcode: 0xC9, bytes: 2 },

  // Bedingte Sprünge (relative)
  { mnemonic: 'BNE', mode: 'relative', opcode: 0xD0, bytes: 2 },
  { mnemonic: 'BEQ', mode: 'relative', opcode: 0xF0, bytes: 2 },
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
  if (/^[A-Za-z_][\w]*$/.test(arg)) return { mode: 'relative', value: 0 }; // Für Labels (BNE, BEQ)
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
      } else if (instr.mnemonic === 'RTS') {
        // RTS benötigt nur 1 Byte
        output.push(instr.opcode);
      }
      pc += instr.bytes;
    } else if (arg in labels) {
      // Labelverarbeitung wie gewohnt
      const addr = labels[arg];
      output.push(0xAD); // LDA absolute
      output.push(addr & 0xFF, addr >> 8);
      pc += 3;
    } else {
      // Verwende showErrorMessage für eine benutzerfreundliche Fehlermeldung
      vscode.window.showErrorMessage(`Unbekannte Zeile: ${line}`);
      output.push(0xEA); // NOP als Fallback
    }
  }

  return new Uint8Array(output);
}
