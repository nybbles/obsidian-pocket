# obsidian-pocket

This plugin for [Obsidian](https://obsidian.md/) that allows you to sync your
[Pocket](https://getpocket.com/) reading list into Obsidian, so that you can
easily create Obsidian notes directly from your Pocket reading list.

![pocket-list](https://raw.githubusercontent.com/nybbles/obsidian-pocket/master/images/pocket-list.png)

## Installation

The plugin will soon be installable from the "Community plugins" settings tab
in Obsidian, as described
[here](https://help.obsidian.md/Advanced+topics/Third-party+plugins#Discover+and+install+community+plugins).

## Usage

After the plugin has been enabled, you will be able to see a "Pocket" option
under the "Plugin options" section of the settings panel, as shown below.

![obsidian-pocket-settings](https://raw.githubusercontent.com/nybbles/obsidian-pocket/master/images/obsidian-pocket-settings.png)

Click on "Connect your Pocket account" to begin the Pocket authorization flow by
opening a web page on your default browser. You will be asked whether you want
to give permission to this plugin to access your Pocket data. Then you will be
redirected back to Obsidian.

If you granted permission to this plugin to access Pocket data, you can click on
"Sync Pocket items" to actually download and store your Pocket list locally
within Obsidian. Once the Pocket list is downloaded and stored, open the command
palette and search for "Pocket" to see the list of available commands for this
plugin.

The single command currently available is "Open Pocket list". The Pocket list is
shown in a screenshot above. Click on any Pocket item's title to create a note
(or navigate to an existing note) and start writing whatever you want about it!

## Feature requests, bug reports and PRs

Feature requests, bug reports and PRs are welcome! Please use
https://github.com/nybbles/obsidian-pocket/issues for this. Please file feature
requests under https://github.com/nybbles/obsidian-pocket/labels/enhancement, or
comment in existing feature requests to indicate your interest.

## Design overview and security considerations

This plugin runs completely on your local desktop. The only external party it
communicates with is Pocket, via the [Pocket
API](https://getpocket.com/developer/). All of your data from Pocket and your
Pocket access token are stored locally.

This plugin uses a locally-running
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) proxy listening
on localhost:9090, using
[cors-anywhere](https://github.com/Rob--W/cors-anywhere), which uses
[node-http-proxy](https://github.com/http-party/node-http-proxy) under the
hood. If it is important for you to be able to change the proxy listening port,
please indicate that in https://github.com/nybbles/obsidian-pocket/issues/17.

This plugin stores your Pocket data locally in Obsidian's IndexedDB.

## Support

If you find this plugin valuable, please let me know! It is great to hear from
people who use what I've built. If you really like this plugin and want to
express that by buying me a coffee, please do 🙏🏾.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/gbraad)

_Please don't feel obligated to donate!_
