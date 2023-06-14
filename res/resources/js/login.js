

document.getElementById("loginForm").addEventListener("submit", function(event) {
  event.preventDefault();
  var username = document.getElementById("username").value;
  var password = document.getElementById("password").value;

  if (username && password) {
    
    fetch('/if/login', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'accept' : 'application/json'
      },
      body: JSON.stringify({
        'user': username,
        'password': password
      })
    }).then((res) => {
      if(res.status == 200) {
        return res.json();
      } else if(res.status == 401) {
        alert("Invalid username or password.");
      } else {
        alert(`Internal server problem, status ${res.status}`);
      }
      throw null;
    }).then((res) => {
      const {token} = res;

      document.cookie = `token=${token};`;
      window.location.href = "/";
    }).catch(() => {
      console.log("catch called");
    })

  } else {
    alert("Please enter a username and password.");
  }
});
