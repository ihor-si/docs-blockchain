import { DefaultTheme } from 'vitepress';
import { normalizePath } from './shared';
import * as matter from 'gray-matter';
import * as glob from 'glob';
import * as fs from 'fs-extra';

type SidebarItemOrdered = DefaultTheme.SidebarItem & { order: number };

export interface Options {
    /**
     * The name of this section
     *
     * @type {string}
     * @memberof Options
     */
    name: string;
    collapsed: boolean;
}

function getTitleFromFile(data: string) {
    const headerInfo = data.match(/#{1,6}\s*.*/g);
    if (headerInfo && headerInfo[0]) {
        return headerInfo[0].replace('# ', '');
    }

    return undefined;
}

/**
 * Returns a single object with relevant information.
 * Automatically retrieves any titles.
 * Automatically orders by the order property.
 *
 * @export
 * @param {string} folderPath
 * @param {Options} options
 * @return { SidebarItemOrdered[] }
 */
export function getFolderFiles(basePath: string, folderPath: string): SidebarItemOrdered[] {
    const files = glob.sync(`${normalizePath(folderPath)}/*.md`);
    const items: SidebarItemOrdered[] = [];
    for (let filePath of files) {
        const frontMatter = matter.read(filePath);
        const newPath = normalizePath(filePath).replace(/.*docs/gm, '');
        let title = frontMatter.data.title ? frontMatter.data.title : getTitleFromFile(frontMatter.content);
        if (!title) {
            title = `No Title: ${folderPath}`;
        }

        items.push({
            text: title,
            order: frontMatter.data.order ? frontMatter.data.order : 0,
            link: newPath,
        });
    }

    return items.sort((a, b) => a.order - b.order);
}

export function getFolderAsSidebar(basePath: string, folderPath: string, appendBasePath = true): SidebarItemOrdered[] {
    if (appendBasePath) {
        folderPath = normalizePath(basePath + '/' + folderPath);
    }

    const items: SidebarItemOrdered[] = getFolderFiles(basePath, folderPath);
    const files = glob.sync(folderPath + '/*');

    for (let filePath of files) {
        // Check if this file / folder is a directory
        const startPath = normalizePath(filePath);
        if (!fs.statSync(startPath).isDirectory()) {
            continue;
        }

        if (startPath.includes('node_modules')) {
            continue;
        }

        // If this is a directory, obtain directory information
        const directorySplit = startPath.split('/');
        const directoryName = directorySplit[directorySplit.length - 1];
        items.push({
            text: directoryName,
            collapsed: true,
            items: getFolderAsSidebar(basePath, startPath, false).sort((a, b) => {
                if (a.order && b.order) {
                    return a.order - b.order;
                }

                if (a.text && b.text) {
                    return a.text.localeCompare(b.text);
                }

                return 0;
            }),
            order: 99,
        });
    }

    const firstElement = items.shift();
    const sortedItems = items.sort((a, b) => {
        if (!a.text || !b.text) {
            return 0;
        }

        if (a.text < b.text) {
            return -1;
        }

        if (a.text > b.text) {
            return 1;
        }

        return 0;
    });

    if (firstElement) {
        sortedItems.unshift(firstElement);
    }

    return sortedItems;
}
