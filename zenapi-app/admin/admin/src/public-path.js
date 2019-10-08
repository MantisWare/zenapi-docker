// Retrieve remote and backend URLs.
const remoteURL = (() => {
  if (window.location.port === '4000') {
    return 'http://localhost:4000/admin';
  }

  // Relative URL (ex: /dashboard)
  if (process.env.REMOTE_URL[0] === '/') {
    return (window.location.origin + process.env.REMOTE_URL).replace(/\/$/, '');
  }

  return process.env.REMOTE_URL.replace(/\/$/, '');
})();
const backendURL = (process.env.BACKEND_URL === '/' ? window.location.origin : process.env.BACKEND_URL);

// Retrieve development URL to avoid to re-build.
const $body = document.getElementsByTagName('body')[0];
const devFrontURL = $body.getAttribute('front') ? window.location.origin + $body.getAttribute('front').replace(/\/$/, '') : null;
const devBackendURL = $body.getAttribute('back') ? window.location.origin + $body.getAttribute('back').replace(/\/$/, '') : null;

$body.removeAttribute('front');
$body.removeAttribute('back');

window.zenapi = {
  remoteURL: devFrontURL || remoteURL,
  backendURL: devBackendURL || backendURL,
};

// Check API Prefix and Applies to BackendURL
fetch(window.zenapi.backendURL+'/_prefix',{
  headers:{
    'Content-Type': 'text/plain'
  }
}).then(response => response.json())
.then(ret => {
  if(ret && ret.prefix && ret.prefix !== ''){
    window.zenapi.backendURL = window.zenapi.backendURL + ret;
  }
}).catch(err => {
  console.log(err);
});

__webpack_public_path__ = window.location.port === '4000' ? `${window.location.origin}/` : `${(zenapi.remoteURL).replace(window.location.origin, '')}/`;
