import adapter from '@sveltejs/adapter-node';

const config = {
  kit: {
    adapter: adapter(),
    serviceWorker: {
      register: false
    }
  }
};

export default config;
