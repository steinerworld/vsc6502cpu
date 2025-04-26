import * as vscode from 'vscode';
import { assemble6502 } from './assembler';

export function activate(context: vscode.ExtensionContext) {
	// Befehl "6502: Assemble Current File"
	const assembleCommand = vscode.commands.registerCommand('extension.assemble6502', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const source = editor.document.getText();
			const bin = assemble6502(source);

			// Erstelle eine temporäre Datei im Arbeitsbereich
			const folderUri = vscode.workspace.workspaceFolders?.[0].uri;
			if (!folderUri) {
				vscode.window.showErrorMessage("Kein Arbeitsbereich geöffnet.");
				return;
			}

			const fileUri = vscode.Uri.joinPath(folderUri, 'assembled_output.bin');

			// Schreibe den Bytecode in die Datei
			try {
				await vscode.workspace.fs.writeFile(fileUri, Buffer.from(bin));
				vscode.window.showInformationMessage(`Assembled ${bin.length} bytes und gespeichert unter: ${fileUri.fsPath}`);
			} catch (error) {
				console.error(`Fehler beim Speichern der Datei: ${error}`);
				//vscode.window.showErrorMessage(`Fehler beim Speichern der Datei: ${error.message}`);
			}
		}
	});
	context.subscriptions.push(assembleCommand);

	const completionProvider = vscode.languages.registerCompletionItemProvider(
		'6502', // Sprach-ID aus package.json
		{
			provideCompletionItems(document, position) {
				const line = document.lineAt(position); // Aktuelle Zeile
				const currentText = line.text.substring(0, position.character); // Bis zum Cursor

				// Vervollständigung der bekannten Befehle
				const instructions = [
					'LDA', 'LDX', 'LDY', 'STA', 'STX', 'STY', 'ADC', 'SBC',
					'INX', 'INY', 'DEX', 'DEY', 'JMP', 'JSR', 'RTS', 'BRK',
					'BNE', 'BEQ', 'BPL', 'BMI', 'BCC', 'BCS', 'BVC', 'BVS',
					'CMP', 'CPX', 'CPY', 'INC', 'DEC', 'AND', 'ORA', 'EOR',
					'TAX', 'TAY', 'TXA', 'TYA', 'TSX', 'TXS', 'PHA', 'PHP',
					'PLA', 'PLP', 'CLC', 'SEC', 'CLI', 'SEI', 'CLV', 'CLD',
					'SED', 'NOP', 'BIT', 'ROL', 'ROR', 'ASL', 'LSR'
				];

				// Vorschläge für Befehle
				const commandSuggestions = instructions.map(instr => {
					const item = new vscode.CompletionItem(instr, vscode.CompletionItemKind.Keyword);
					item.insertText = instr;
					return item;
				});

				// Labels erkennen: Alle Label-Deklarationen suchen
				const labelSuggestions: vscode.CompletionItem[] = [];
				const labelRegex = /^[ \t]*([A-Za-z_][\w]*):/;  // Regulärer Ausdruck für Labels

				for (let i = 0; i < document.lineCount; i++) {
					const lineText = document.lineAt(i).text;
					const match = lineText.match(labelRegex);
					if (match) {
						const label = match[1]; // Erster Capturing-Gruppe (Labelname)
						const labelItem = new vscode.CompletionItem(label, vscode.CompletionItemKind.Variable);
						labelItem.insertText = label + ':'; // Label mit ':' einfügen
						labelSuggestions.push(labelItem);
					}
				}

				// Zusammenführen von Befehlen und Labels
				return [...commandSuggestions, ...labelSuggestions];
			}
		},
		':' // Trigger nach ":" (also bei Labelverwendung)
	);
	context.subscriptions.push(completionProvider);
}
