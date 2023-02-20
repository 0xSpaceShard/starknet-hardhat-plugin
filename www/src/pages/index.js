import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";

import styles from "./index.module.css";

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <header className={clsx("hero hero--primary", styles.heroBanner)}>
            <div className="container margin-vert--lg">
                <img src="img/logo.svg" style={{ width: "8em" }} />
                <h1 className="hero__title margin-top--lg thin">{siteConfig.title}</h1>
                <p className="hero__subtitle margin-bottom--lg">{siteConfig.tagline}</p>
                <div className={styles.buttons}>
                    <Link
                        className="margin-horiz--md button button--secondary button--lg"
                        to="docs/intro#cli-commands"
                    >
                        CLI commands
                    </Link>

                    <Link
                        className="margin-horiz--md button button--secondary button--lg"
                        to="docs/intro#api"
                    >
                        JS utilities - API
                    </Link>

                    <a
                        className="margin-horiz--md button button--secondary button--lg"
                        href="https://github.com/Shard-Labs/starknet-hardhat-example"
                    >
                        Example repo
                    </a>
                </div>
            </div>
        </header>
    );
}

export default function Home() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout
            title={`Hello from ${siteConfig.title}`}
            description="Description will go into a meta tag in <head />"
        >
            <HomepageHeader />
            <main>
                <div className="container margin-top--xl text--center">
                    <h1 className="thin">
                        <strike>Ethereum</strike> Starknet Development environment for professionals
                    </h1>
                </div>
                <HomepageFeatures />
            </main>
        </Layout>
    );
}
