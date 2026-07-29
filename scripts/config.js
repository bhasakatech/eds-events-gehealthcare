const config = {
  author: 'https://author-p139816-e1765605.adobeaemcloud.com',
  publish: 'https://publish-p139816-e1765605.adobeaemcloud.com',

  get host() {
    return window.location.origin.includes('author')
      ? this.author
      : this.publish;
  },
};

export default config;
