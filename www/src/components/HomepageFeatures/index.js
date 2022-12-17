import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";
const FeatureList = [
    {
        title: "Test with JavaScript",
        Svg: require("@site/static/img/undraw_test.svg").default,
        description: (
            <>
                Write your tests in JS. Example,
                <pre>{"contract.call('entrypoint', {... });"}</pre>
            </>
        )
    },
    {
        title: "Test composability",
        Svg: require("@site/static/img/undraw_composability.svg").default,
        description: (
            <>
                Declare, deploy with construtor args and call to test systems composed of multiple
                smart contracts.
            </>
        )
    },
    {
        title: "JavaScript/TypeScript",
        Svg: require("@site/static/img/undraw_at_home.svg").default,
        description: (
            <>
                Convenience of JS/TS and Hardhat. Check out{" "}
                <a
                    href="https://hardhat.org/tutorial/creating-a-new-hardhat-project.html"
                    rel="nofollow"
                >
                    Setting up a Hardhat project
                </a>
                .
            </>
        )
    }
];

function Feature({ Svg, title, description }) {
    return (
        <div className={clsx("col col--4")}>
            <div className="text--center background-circle">
                <Svg className={styles.featureSvg} role="img" />
            </div>
            <div className="margin-top--md text--center padding-horiz--md">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function HomepageFeatures() {
    return (
        <section className={styles.features}>
            <div className="container margin-vert--xl">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
