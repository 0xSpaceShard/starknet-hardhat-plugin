// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "StarkNet Hardhat Plugin",
    tagline: "A plugin for integrating StarkNet tools into Hardhat projects",
    url: "https://Shard-Labs.github.io",
    // baseUrl: "/",
    baseUrl: "/starknet-hardhat-plugin/",
    onBrokenLinks: "throw",

    onBrokenMarkdownLinks: "warn",
    favicon: "img/logo.svg",
    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "Shard-Labs", // Usually your GitHub org/user name.
    projectName: "starknet-hardhat-plugin", // Usually your repo name.

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"]
    },

    presets: [
        [
            "classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve("./sidebars.js"),
                    editUrl:
                        "https://github.com/Shard-Labs/starknet-hardhat-plugin/tree/master/docs"
                },
                blog: {
                    showReadingTime: true,
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        "https://github.com/Shard-Labs/starknet-hardhat-plugin/tree/master/docs"
                },
                theme: {
                    customCss: require.resolve("./src/css/custom.css")
                }
            })
        ]
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            navbar: {
                title: "StarkNet Hardhat Plugin",
                logo: {
                    alt: "StarkNet Hardhat Plugin Logo",
                    src: "img/logo.svg"
                },
                items: [
                    {
                        type: "doc",
                        docId: "intro",
                        position: "left",
                        label: "Intro"
                    },
                    {
                        type: "doc",
                        docId: "dev",
                        position: "left",
                        label: "Dev"
                    },
                    {
                        href: "https://github.com/Shard-Labs/starknet-hardhat-plugin",
                        label: "GitHub",
                        position: "right"
                    }
                ]
            },
            footer: {
                style: "dark",
                links: [
                    {
                        title: "Docs",
                        items: [
                            {
                                label: "Intro",
                                to: "/intro"
                            },
                            {
                                label: "Starknet Hardhat example",
                                href: "https://github.com/Shard-Labs/starknet-hardhat-example"
                            }
                        ]
                    },
                    {
                        title: "Community",
                        items: [
                            {
                                label: "Twitter",
                                href: "https://twitter.com/shard_labs"
                            }
                        ]
                    },
                    {
                        title: "More",
                        items: [
                            {
                                label: "GitHub",
                                href: "https://github.com/Shard-Labs/starknet-hardhat-plugin"
                            }
                        ]
                    }
                ],
                copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme
            }
        })
};

module.exports = config;
