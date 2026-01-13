import * as vscode from "vscode";
import { EXPRESSO_VARIANT_STYLES, ExpressoTag } from "../types/expresso";

/**
 * Format @expresso /task-start the /expresso command for clipboard
 */
function formatExpressoCommand(tag: ExpressoTag): string {
  // Escape double quotes in task description
  const escapedTask = tag.taskDescription.replace(/"/g, '\\"');

  // Format: /expresso path/to/file.ts:42 "task description"
  return `/expresso ${tag.relativePath}:${tag.line} "${escapedTask}"`;
}

/**
 * Register all expresso-related commands
 */
export function registerExpressoCommands(
  context: vscode.ExtensionContext
): void {
  // Main brew command - triggered by CodeLens click
  const brewCommand = vscode.commands.registerCommand(
    "aiCockpit.brewExpresso",
    async (tag: ExpressoTag) => {
      if (!tag) {
        vscode.window.showErrorMessage("No expresso tag provided");
        return;
      }

      try {
        // Format the command
        const command = formatExpressoCommand(tag);

        // Copy to clipboard
        await vscode.env.clipboard.writeText(command);

        // Get emoji for variant
        const style = EXPRESSO_VARIANT_STYLES[tag.variant];

        // Show toast notification with action button
        const action = await vscode.window.showInformationMessage(
          `${style.emoji} Ready to brew! Paste in terminal`,
          "Open Terminal"
        );

        // Optionally open terminal if user clicks the button
        if (action === "Open Terminal") {
          vscode.commands.executeCommand("workbench.action.terminal.focus");
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy: ${error}`);
      }
    }
  );

  // Command to manually scan workspace for expresso tags
  const scanCommand = vscode.commands.registerCommand(
    "aiCockpit.scanExpresso",
    async () => {
      vscode.window.showInformationMessage("☕ Scanning for @expresso tags...");
      // The actual scanning will be triggered by the scanner service
      // This command is a placeholder for manual trigger
    }
  );

  // Command to show all expresso tags (future: opens sidebar panel)
  const listCommand = vscode.commands.registerCommand(
    "aiCockpit.listExpresso",
    async () => {
      vscode.window.showInformationMessage(
        "☕ Expresso tag list coming soon! For now, tags are shown in the editor."
      );
    }
  );

  // Command to go to a specific expresso tag
  const goToTagCommand = vscode.commands.registerCommand(
    "aiCockpit.goToExpressoTag",
    async (tag: ExpressoTag) => {
      if (!tag) {
        return;
      }

      try {
        const document = await vscode.workspace.openTextDocument(tag.filePath);
        const editor = await vscode.window.showTextDocument(document);

        // Move cursor to the tag line
        const position = new vscode.Position(tag.line - 1, tag.columnStart);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Could not open file: ${error}`);
      }
    }
  );

  context.subscriptions.push(
    brewCommand,
    scanCommand,
    listCommand,
    goToTagCommand
  );
}
