const utils = require("./utils");

function publishNativeBaseTemplates() {
  try {
    var gitRemoteURL = execSync(
      "git config --get remote.origin.url"
    ).toString();

    if (gitRemoteURL.trim() !== utils.gitTemplateRemoteURL) {
      console.error(`Wrong git repo!, ${gitRemoteURL}`);
      return;
    }

    execSync(`git checkout -b master`);

    fs.readdirSync(lib).forEach(function (mod) {
      let modPath;
      if (
        mod === "react-native-template-nativebase" ||
        mod === "react-native-template-nativebase-typescript" ||
        mod === "solito-universal-app-template-nativebase" ||
        mod === "solito-universal-app-template-nativebase-typescript" ||
        mod === "cra-template-nativebase" ||
        mod === "cra-template-nativebase-typescript" ||
        mod === "nextjs-with-native-base" ||
        mod === "nextjs-with-native-base-typescript" ||
        mod === "expo-nativease" ||
        mod === "expo-nativebase-typescript"
      ) {
        execSync(`yarn publish`);
      }
    });
  } catch (Err) {
    console.error(Err);
    console.error("Something went wrong!");
  }
}

module.exports.publishNativeBaseTemplates = publishNativeBaseTemplates;
