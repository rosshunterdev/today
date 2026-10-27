// Night pages before first paint, so a dark journal never flashes white.
// A plain file, not inline: the Content-Security-Policy allows scripts from this site only.
try {
  if (localStorage.getItem('today.theme') === 'night') {
    document.documentElement.dataset.theme = 'night';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#202329');
  }
} catch (e) {}
