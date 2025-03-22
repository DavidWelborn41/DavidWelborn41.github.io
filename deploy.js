const ghpages = require('gh-pages');
const path = require('path');

// Publish the dist folder to gh-pages branch
ghpages.publish(
  path.join(process.cwd(), 'dist'),
  {
    branch: 'gh-pages',
    message: 'Auto-deploy from deploy script'
  },
  (err) => {
    if (err) {
      console.error('Deployment failed:', err);
      return;
    }
    console.log('Successfully deployed to GitHub Pages!');
  }
); 