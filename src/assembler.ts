export function assemble6502(source: string): Uint8Array {
    const lines = source.split(/\r?\n/);
    const output: number[] = [];
  
    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();
      if (trimmed === "LDA #$01") {
        output.push(0xA9, 0x01); // Beispiel: LDA #$01
      }
      // TODO: Mehr Opcodes, Labels, Parser
    }
  
    return new Uint8Array(output);
  }