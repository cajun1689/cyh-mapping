## HT Backend: Auth Setup

WRT potential security risks in our auth setup:
- Fixed: There's a known memory-leak issue with Express Session stores that I already fixed. 

### Auth tour: UX
- When users first visit the site, they'll see the login page. All other routes are protected against non-authenticated users. 
- If non-authenticated user try to visit other routes, while logged out they'll be taken back to the login screen.
- There are two exceptions to the above: the routes that let users reset their password. Those aren't protected, and they shouldn't be, since we need to let users reset their password without accessing the rest of the app.
- After a user resets their password, they're prompted to login. 

### Behind the scenes
- Behind the scenes, our auth setup uses:
- Passport & Passport-Local-Stategy
- Postgres (to hold session data)
- Express-sessions
- Connect-flash to display error messages related to login or password-reset process
- connect-pg-store. This is the Postgres-based session store Express sessions uses to store temporary session-based user data.

All usernames and passwords are stored in a special "session" table on Postgres, which is automatically created and managed by Express-session & connect-pg-store.

Express-sessions was chosen because it only ever sends a session id to the user's browser; it doesn't send any other information like email or role.

However, the server can access any user information in any route, using the the ````req.user````
 object. To access a user's email, for example, use 
  ```req.user.email```
  inside a route, and you'll be good to go! 

#### Summary

- Express sessions allows the server to see a user's confidential information, without exposing it to the client. It's also widely used and well documented, so it seemed like a good choice for us.

- All routes are protected against non-authenticated users, except for routes pertaining to resetting lost passwords, and the login route itself.