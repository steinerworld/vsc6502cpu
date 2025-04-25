import * as vscode from 'vscode';
import { assemble6502 } from './assembler';

export function activate(context: vscode.ExtensionContext) {
	// Befehl "6502: Assemble Current File"
	const assembleCommand = vscode.commands.registerCommand('extension.assemble6502', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const source = editor.document.getText();
			const bin = assemble6502(source);
			vscode.window.showInformationMessage(`Assembled ${bin.length} bytes`);
			// Optional: speichern oder hex-dump anzeigen
		}
	});
	context.subscriptions.push(assembleCommand);

	// Auto-Vervollständigung für 6502-Opcode
	const completionProvider = vscode.languages.registerCompletionItemProvider(
		'6502asm', // ID aus package.json -> "languages"
		{
			provideCompletionItems(document, position, token, context) {
				const instructions = [
					"LDA", "STA", "LDX", "LDY", "STX", "STY",
					"ADC", "SBC", "AND", "ORA", "EOR",
					"JMP", "JSR", "RTS", "RTI", "BRK",
					"BNE", "BEQ", "BCC", "BCS", "BMI", "BPL", "BVC", "BVS",
					"TAX", "TXA", "TAY", "TYA", "TXS", "TSX",
					"INX", "DEX", "INY", "DEY", "NOP"
				];
				return instructions.map(instr => {
					const item = new vscode.CompletionItem(instr, vscode.CompletionItemKind.Keyword);
					item.insertText = instr + ' ';
					return item;
				});
			}
		},
		'' // Triggerzeichen, z. B. leer = bei jedem Buchstaben
	);
	context.subscriptions.push(completionProvider);
}
