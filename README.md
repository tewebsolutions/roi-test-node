# ROI Test

Problem
--------
Test: Simple login web app

###Back end:
Preferred stack: Node.js
Another option: PHP

###Front end:
Stack: HTML/CSS/Javascript

###Brief:

- Create a registration/login logic with reset password
- Registration should include confirmation email
- Login should have an option to login through Facebook and Twitter as well
- Send out welcome email (after completed registration) using Mandril
###Bonus:
- Use CSS3 animations on the front-end to make the login form more fancy

Solution
----------
The app was developed into two independent layers, an HTML/JS Front-End and a Node.JS Web Service.

## The Front-end

The Front-end is a single page application that manages screens (views), performs form validation, handles web service calls, authentication, flash messages to the user, and provides an extensible backbone for additional features.

It is stored under `/client/` and served using Express Static File Server.

There are three files: `index.html`, `main.css`, `main.js`

Screens are created by specifying divs with data attributes

		<div data-page="setpassword" data-secure="true" data-title="Set New Password">
					<!--Secure Content -->
		</div>

Secure views have `data-secure="true"` and can provide a `data` callback that is called after the user is authorized.

`app.screens['setpassword'].data = function() {};	`

Form elements on every screen are namespaced to avoid collision with other screens. 

		<div data-page="setpassword" data-secure="true" data-title="Set New Password">
						<form>
							<input name="password" placeholder="Password">
							<button>Submit</button>
						</form>
		</div>
		<div data-page="register"  data-title="Register">
					<form>
						<input name="email" placeholder="Email">
						<input name="password" placeholder="Password">
						<button>Sign Up</button>
					</form>
		</div>
	

Routing is automatically applied to clickable elements with `data-attribute` values.

	<button data-route="register" type="button">Register</button>
	<button data-route="setpassword" type="button">Set Password</button>

Using data-attributes eliminates the need for the excessive event handlers such as:

	$("div[data-page=register] button]").click(
		function(e){
			app.goToScreen('setpassword');
		});
		
The router uses the HTML5 History API and changing browser titles to simulate actual screen changes. Since the browser does not have to fetch data from the server or perform DOM manipulations between screen transitions, it gives the user a seamless appearance. 

[John Resig's Microtemplating](http://ejohn.org/blog/javascript-micro-templating/) and other utilities are found in `util.js`

### Todos

 - Change Password Screen
 - Delete Account Option


## Back-end

The Back-end uses SQLite for storing user information and utilizes ExpressJS/PassportJS for web services (`index.js`) and authentication (`auth.js`).

It uses a DB abstraction (`db.php`) layer that can be substituted with MongoDB (or any other asynchronous RDBMS) for persisting user data. 

The SQLite database is a minimalist database for basic user management. It consists of two tables `user`, `user_token`. 

- `user` stores the person's full name, email, password, and social login information. It uses email as a unique ID.
- `user_token` stores temporary tokens used for email verification purposes (password reset, activation).

All the secure API calls to the web service are secured with a unique session (cookie-based).

###Process
####Registration

- All user registrations must confirm their activation email before they can login.
- Every time a person attempts to login, a new activation email is sent to the email address.
- If a person activates his account, all email tokens become invalidated.

Users who come through social networks do not need to confirm their email addresses. (The social network has already done this).

####Password Reset
 
- If a user loses their password, they can have a password reset link sent to their email. (24 hour expiration)
- If a user clicks on a password reset link, they will become authenticated and be given the opportunity to set their new password.
- Whenever a user sets his/her password, all email tokens become invalidated.



###Social Networks
The app uses email to identify users, and assumes it remains constant across social networks. As such, it does not support providers that don't support email through OAuth such as Twitter. [Discussion](http://bit.ly/1Vuq82C)

In cases where conflicting profile information is presented between different providers, the app merges local user data (SQLite) with the profile with the most data. 

###Security
The actions under the route `/api/<action>` can be safely transported into RESTful APIs for other clients as they do not directly interact with the the HTML client.  `/token/` and `/logout` are used by the client for initiating and terminating sessions.

Currently the HTTP APIs are not RESTful web services, as they rely on session cookies. It is possible to override the authentication middleware in `auth.js` to use token based authentication.

The app is not protected against CSRF attacks.


### Version
0.0.2

### Tech

Dillinger uses a number of open source projects to work properly:

* [jQuery/Zepto] - JS Library
* [Skeleton CSS] - Base CSS library
* [Microtemplating] - John Resig's Microtemplating Library

* [ExpressJS 4] - Node.JS Web Server
* [SQLite] - Lightweight SQL database
* [PassportJS] - Node.JS Authentication Module
* [Node-Mandrill] - Node.JS Mandrill Wrapper

### Demo
https://roi-test-node-kpsychwave.c9.io


### Installation

You need NPM/Node.JS installed globally:

```sh
$ git clone [git-repo-url] roitest
$ cd roitest
$ npm install
$ chmod 644 private
```
Update the contents of `globals.js` with your API keys and customizations
```sh
$ npm start
$ NODE_ENV=production node app
```

### External Services

ROI Test uses these external services

* Facebook OAuth Key/Secret [https://developers.facebook.com](https://developers.facebook.com)
* Github OAuth [https://developer.github.com/v3/oauth/](https://developer.github.com/v3/oauth/)
* Mandrill API [https://mandrillapp.com/api/docs](https://mandrillapp.com/api/docs)


### Todos

 - Write Tests
 - Centralize user messages in one location
 - Use `async` module to avoid callback hell

