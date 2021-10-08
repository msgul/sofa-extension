const vscode = require('vscode');
const request = require('request-promise');
const cheerio = require('cheerio');
const clipboardy = require('clipboardy');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// to ignore ssl certificate error on stackoverflow

let last_link;

function activate(context) {
	let disposable = vscode.commands.registerCommand('sofa.getcode', function () {
		let language = vscode.window.activeTextEditor.document.languageId
		let activeLine = vscode.window.activeTextEditor.selection.active.line;
		vscode.window.activeTextEditor.selection.active.line = activeLine + 1;
        
		vscode.commands.executeCommand("editor.action.clipboardCopyAction").then(() => {
            vscode.commands.executeCommand("editor.action.addCommentLine");
            vscode.commands.executeCommand("editor.action.insertLineAfter");
            vscode.window.activeTextEditor.selection.active.line = activeLine + 1;
            vscode.env.clipboard.readText().then((text) => {
                console.log(text);
                let query = text.trim();

                if(query == ""){
                    if(typeof last_link !== "undefined")
                        vscode.env.openExternal(vscode.Uri.parse(last_link));
                    return;
                }
                    
                query = language + "+" + query.replaceAll(" ", "+") + "+stackoverflow";
                let url = "https://www.google.com/search?q=" + query;
                console.log(url);
                search(url);
            });
		});
	});

	context.subscriptions.push(disposable);
}

function search(url) {
	request(url).then(html => {
		let $ = cheerio.load(html);
        let links = [];

		$("h3").each((index, element) => {
			let link = element.parent.attribs.href
			link = link.split("=")[1].split("&sa")[0]
			if(link.includes("stackoverflow.com")){
				links.push(link);
			}
		});

        if(links.length > 0)
            getcodes(links[0]);
        else
            vscode.window.showInformationMessage("Sofa could not find it!");
	})
}

function getcodes(link) {

    last_link = link;

    request(link).then(function (html) {
        let $ = cheerio.load(html);
        let list = [];

        $(".answercell").find("pre > code").each(function (index, element) {
            list.push($(element).text().replace(">>> ", ""))
        })

        if (list.length > 1) {
            vscode.window.showQuickPick(list).then(result => {
                console.log(result);
                clipboardy.writeSync(result + "\n");
                vscode.commands.executeCommand("editor.action.clipboardPasteAction");
            });

        } else if (list.length == 1) {
            clipboardy.writeSync(list[0] + "\n");
            vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        } else {
            vscode.window.showInformationMessage("Sofa could not find it!");
        }
    }).catch(function (error) {
        vscode.window.showInformationMessage("Request error!", error);
    });
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
