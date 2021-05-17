import Twitter from "twitter";

tweet({
  status: "Hell from my terminal",
}).then(console.log, console.error);

async function tweet(options) {
  const twitter = new Twitter({
    consumer_key: process.env.TWITTER_TEST_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_TEST_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_TEST_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_TEST_ACCESS_TOKEN_SECRET,
  });

  return new Promise((resolve, reject) => {
    twitter.post("statuses/update", options, (error, result) => {
      if (error) {
        return reject(error);
      }

      resolve({
        text: options.status,
        url: `https://twitter.com/${result.user.screen_name}/status/${result.id_str}`,
      });
    });
  });
}