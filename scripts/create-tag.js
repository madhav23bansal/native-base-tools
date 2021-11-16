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
    setRemoteDataAndCheckForEnv();
};

function setRemoteDataAndCheckForEnv() {
    var ls = spawn('git', ['remote', '-v']);

    ls.stdout.on("data", function (data) {
        remoteData = JSON.stringify(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`error: ${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        if (remoteData.match(/\@([^)]+)\:/).pop() == "github.com") {
            if (!process.env.GITHUB_PERSONAL_TOKEN) {
                console.error("Please check GITHUB_PERSONAL_TOKEN in your env file");
                return;
            }
        }
        getVersion();
    });
}

function getVersion() {
    var ls = spawn('sh', [getVersionPath]);
    ls.stdout.on("data", function (data) {
        packageJsonVersion = `${data}`;
        packageJsonVersion = packageJsonVersion.trim();
    });
    ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
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

    let tagName = `v${packageJsonVersion}`;
    octokit.rest.repos.createRelease({
        owner: owner,
        repo: repo,
        tag_name: tagName,
        prerelease: preRelease,
        name: tagName,
    }).then((response) => {
        console.log("Tag created Successfully!");
    }).catch((error) => {
        console.error(error.response.data);
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

