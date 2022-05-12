# obsidian-pocket

This plugin for [Obsidian](https://obsidian.md/) that allows you to sync your
[Pocket](https://getpocket.com/) reading list into Obsidian, so that you can
easily create Obsidian notes directly from your Pocket reading list.

![pocket-list](https://raw.githubusercontent.com/nybbles/obsidian-pocket/master/images/pocket-list.png)

## Initial setup

After the plugin has been enabled, you will be able to see a "Pocket" option
under the "Plugin options" section of the settings panel. Click on it to go to
the obsidian-pocket settings tab, where you can connect your Pocket account and
set up the obsidian-pocket plugin.

### Connect your Pocket account

Click on "Connect your Pocket account" to begin the Pocket authorization flow by
opening a web page on your default browser. You will be asked whether you want
to give permission to this plugin to access your Pocket data. Then you will be
redirected back to Obsidian. Your Pocket account should now be connected.

The "Disconnect your Pocket account" button can be used to remove the Pocket
authorization that was just provided.

### Specify settings

The obsidian-pocket settings tab will contain a number of settings that affect
how obsidian-pocket syncs Pocket items and creates Pocket item notes, as
described below:

| Setting                                 | Default value                      | What it does                                                                                                                                                                                             |
| --------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create Pocket items on sync             | Enabled                            | Create Pocket item notes automatically when new Pocket items are synced                                                                                                                                  |
| Multi-word Pocket tag converter options | Snake case                         | Specifies how to convert multi-word Pocket tags into Obsidian-compatible tags                                                                                                                            |
| Pocket sync tag                         | Blank (sync all Pocket items)      | Specifies a Pocket tag so that only Pocket items with that tag will be synced                                                                                                                            |
| Pocket item notes folder location       | Obsidian vault root folder         | Specifies the folder whether new Pocket item notes will be stored                                                                                                                                        |
| Pocket item note template file location | Blank (use the default template)   | Specifies a custom template file to use to create new Pocket item notes                                                                                                                                  |
| Front matter URL key                    | URL (matches the default template) | Specifies the [YAML front matter](https://help.obsidian.md/Advanced+topics/YAML+front+matter) key that will be used to find the Pocket item's URL, used to match Pocket items to their respective notes. |

It is highly encouraged that you use the default Pocket item notes template and
front matter URL key. If you decide to customize these option, please ensure
that your Pocket item notes do end up having a valid front matter key for Pocket
item URL.

## Usage

### Available commands

| Command                              | What it does                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pocket: Open Pocket list             | Opens a list in Obsidian where you can see your synced Pocket items and go to the Pocket URL, the original URL or create/open a Pocket item note |
| Pocket: Sync Pocket list             | Syncs Pocket items from Pocket to Obsidian                                                                                                       |
| Pocket: Index all files by URL       | Find all Pocket item notes in the vault by checking whether a file has a URL front matter key that matches a synced Pocket item                  |
| Pocket: Create all Pocket item notes | Creates a Pocket item note for all Pocket items that lack one                                                                                    |

### Syncing Pocket items

You can sync your Pocket items using an Obsidian command: "Sync Pocket list", or
the button in the obsidian-pocket settings tab.

You can either sync all Pocket items or just Pocket items with a particular tag
that you specify, using the "Pocket sync tag" setting. Leave it blank to sync
all Pocket items, or specify a Pocket tag to limit your sync to just Pocket
items with that tag.

### Opening and using the Pocket list

Once the Pocket list is downloaded and stored, open the command palette and
search for "Pocket" to see the list of available commands. The command to open
the Pocket list is "Open Pocket list". The Pocket list is shown in a screenshot
above.

The Pocket list can be used to browse through the items you've saved to Pocket
and to create a note for any Pocket item by clicking on its title. You can also
go directly to the URL for the Pocket item.

### Pocket tags in Obsidian

Pocket tags are synced and presented in the Pocket list. Pocket supports tags
with spaces in them, whereas Obsidian does not. The way that obsidian-pocket
handles Pocket tags with spaces can be configured in the "Multi-word Pocket tag
converter options" setting shown in the screenshot above.

The available options are:

- (Enabled by default) Snake case ('#tag with spaces' becomes #tag_with_spaces)
- Camel case ('#tag with spaces' becomes #TagWithSpaces)
- Do nothing ('#tag with spaces' remains unchanged)

These settings only affect the Pocket tags displayed in the Pocket list, and the
tags that are inserted into a Pocket item note if you have `{{tags}}` in your
Pocket item note template (see below for using templates for Pocket item
notes). They do not affect already-existing Obsidian tags or Pocket tags.

### Notes for Pocket items

Click on any Pocket item's title to create a note (or navigate to an existing
note) for that Pocket item. Notes for Pocket items will be created in the Pocket
item notes folder, which can be configured in settings. If no Pocket item notes
folder is set, then Pocket item notes will be created in the root folder.

A template for new Pocket item notes can be specified in settings.

Open the Pocket item URL in your browser using Meta+click for Linux and Mac OS
(e.g. command+click on Mac OS) and using Alt+click for Windows.

Notes in Obisidan are matched to Pocket items based on a specific tag in their
[frontmatter](https://help.obsidian.md/Advanced+topics/YAML+front+matter). The
tag that is used is "URL" by default, but can be changed in settings.

This means that while Pocket item notes are created by default in the Pocket
items notes folder, they can be moved elsewhere and/or renamed without breaking
the connection to the Pocket item with matching URL. It also means that you can
create notes with the URL frontmatter and they will be automatically connected
to the relevant Pocket item note with the matching URL, although the Pocket item
template would not be used in that case.

Use the "Index all files by URL" command to ensure that `obsidian-pocket` knows
about all files that contain a frontmatter tag for URL, thereby allow it to
match those notes to Pocket items. This index is maintained by `obsidian-pocket`
automatically, so you should not need to run it.

> :warning: As of version 0.8.0 of obsidian-pocket, Obsidian notes are matched to
> Pocket items only using the front matter URL key, and no longer matched by
> title. The last version to support matching by title was version 0.7.2. This
> functionality was removed because it did not work well with Pocket items that
> had the same title, but different URLs.

## Using custom templates for Pocket notes

> :warning: Please use the default template and front matter URL key, unless you
> are confident that you can customize these settings while ensuring that the
> Pocket item notes have valid frontmatter YAML and that the URL frontmatter key
> matches what you have asked obsidian-pocket to look for.

Templates for Pocket notes work similar to any other template in Obsidian, see
[here](https://help.obsidian.md/Plugins/Templates), except that only the
following variables are supported:

| Variable name      | What it means                                           |
| ------------------ | ------------------------------------------------------- |
| `{{title}}`        | The title of the Pocket item                            |
| `{{url}}`          | The URL of the Pocket item                              |
| `{{pocket-url}}`   | The URL to open the Pocket item in Pocket               |
| `{{excerpt}}`      | The excerpt extracted by Pocket for the Pocket item     |
| `{{tags-no-hash}}` | The Pocket tags for the Pocket item                     |
| `{{tags}}`         | The Pocket tags for the Pocket item, with "#" prepended |
| `{{image}}`        | The main image for the Pocket item                      |

This is the default template in obsidian-pocket. It will populate the [YAML
frontmatter](https://help.obsidian.md/Advanced+topics/YAML+front+matter) of the
Pocket item note with all available metadata used in the correct places so that
YAML frontmatter is valid, hashtags work correctly and the Pocket item's main
image is displayed (if available):

```
---
Title: "{{title}}"
URL: {{url}}
Pocket URL: {{pocket-url}}
Tags: [pocket, {{tags-no-hash}}]
Excerpt: >
    {{excerpt}}
---
{{tags}}
{{image}}
```

If you had saved [this
URL](https://www.technologyreview.com/2021/07/08/1027908/carbon-removal-hype-is-a-dangerous-distraction-climate-change/)
to Pocket with the tag "Carbon removal", synced it to Obsidian using this plugin
and then created a note for the corresponding Pocket item with the above
template, your note would start off containing the following:

```
---
Title: "Carbon removal hype is becoming a dangerous distraction"
URL: https://www.technologyreview.com/2021/07/08/1027908/carbon-removal-hype-is-a-dangerous-distraction-climate-change/
Pocket URL: https://getpocket.com/read/1337
Tags: [pocket, carbon_removal]
Excerpt: >
    In February, oil giant Shell trumpeted a scenario in which the world pulls
    global warming back to 1.5 ˚C by 2100, even as natural gas, oil, and coal
    continue to generate huge shares of the world’s energy.
---
#carbon_removal
![image](http://via.placeholder.com/640x360)
```

Note that in the example template, the title is quoted so that the YAML
frontmatter is valid, even if the Pocket item has a title with colons in it.

## Feature requests, bug reports and PRs

Feature requests, bug reports and PRs are welcome! Please use
https://github.com/nybbles/obsidian-pocket/issues for this. Please file feature
requests under https://github.com/nybbles/obsidian-pocket/labels/enhancement, or
comment in existing feature requests to indicate your interest.

Please provide console logs if you are filing a bug report, so that it can be
reproduced and fixed. You can copy/paste console logs from the Obsidian dev
console, which can be opened by going to View > Toggle Developer Tools in
Obsidian.

## Design overview and security considerations

This plugin runs completely locally. The only external party it communicates
with is Pocket, via the [Pocket API](https://getpocket.com/developer/). All of
your data from Pocket and your Pocket access token are stored locally.

This plugin stores your Pocket data locally in Obsidian's IndexedDB.

## Support

If you find this plugin valuable, please let me know! It is great to hear from
people who use what I've built. If you really like this plugin and want to
express that by buying me a coffee, please do 🙏🏾.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/nybbles)

_Please don't feel obligated to donate!_
