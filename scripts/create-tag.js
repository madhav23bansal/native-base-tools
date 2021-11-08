#! /usr/bin/env node

require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const { spawn } = require('child_process');

const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });
const getVersionPath = __dirname + "/get-package-json-version.sh";

let preRelease;
let remoteData;
let packageJsonVersion;

function createTag() {
    getVersion();
};

function getVersion() {
    var ls = spawn('sh', [getVersionPath]);
    ls.stdout.on("data", function (data) {
        packageJsonVersion = `${data}`;
    });
    ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        checkToken();
    });
}

function checkToken() {
    if (process.env.GITHUB_PERSONAL_TOKEN) {
        getOriginData();
    } else {
        console.error("Please check GITHUB_PERSONAL_TOKEN in your env file");
    }
}

function getOriginData() {
    var ls = spawn('git', ['remote', '-v']);

    ls.stdout.on("data", function (data) {
        remoteData = JSON.stringify(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`Switched to a new branch: release/${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        checkOrigin();
    });
}

function checkOrigin() {
    if (remoteData.match(/\@([^)]+)\:/).pop() == "github.com") {
        let remoteSample = remoteData.match(/\:([^)]+)\./).pop();
        let gitVariables = remoteSample.split('/');
        let owner = gitVariables[0].trim();
        let repo = gitVariables[1].trim();
        createTagGithub(owner, repo);
    } else {
        createTagGitlab();
    }
}

function createTagGithub(owner, repo) {
    if (packageJsonVersion.includes('rc') || packageJsonVersion.includes('alpha')) {
        preRelease = true;
    } else {
        preRelease = false;
    }
    octokit.rest.repos.createRelease({
        owner: owner,
        repo: repo,
        tag_name: `v${packageJsonVersion}`,
        prerelease: preRelease,
        name: `v${packageJsonVersion}`,
    }).then((response) => {
        console.log("Tag created Successfully!");
    }).catch((error) => {
        console.error(error.response.data.message);
    });
}

function createTagGitlab() {
    var ls = spawn('git', ['tag', '-a', `v${packageJsonVersion}`, '-m', `Version ${packageJsonVersion}`]);
    ls.stdout.on("data", function (data) {
        console.log(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`/${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        pushTagToGitlab();
    });
}

function pushTagToGitlab() {
    var ls = spawn('git', ['push', 'origin', '--tags']);
    ls.stdout.on("data", function (data) {
        console.log(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`/${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        console.log("Tag Created Successfully!");
    });
}

module.exports.createTag = createTag;

