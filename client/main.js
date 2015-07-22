var app = {};
app.appName = 'ROI DNA';
   
$(document).ready(function($) {

    (function($, roi) {
        var $screens = $("#screens"),
            $curr, $dest, title, url;


        //Disable submit on enter
        $('input,select').keypress(function(event) {
            if (event.keyCode == '13') {
                $(event.target).parents('form').trigger('submit');
                return false;
            }
        });

        app.session = false;

        //Validation rules
        app.validate = {};
        app.validate.password = function(password, confirm) {

            var valid = true;

            //Validation rules in order
            if (valid && password !== confirm) {
                app.message("Passwords do not match, please check again", "error");
                valid &= false;
            }

            if (valid && (password.length < 6 || password.length > 12)) {
                app.message("Password needs to be between 6 and 12 characters", "error");
                valid &= false;
            }

            return valid;
        };

        //Screens correspond to <div class="screen">
        // screen.handler: Form submit handler
        // screen.data: Data function for secure pages
        app.screens = {

            'login': {
                handler: function(target) {
                    var $formData = $(target);
                    var email = $formData.find('[name=email]').val(),
                        password = $formData.find('[name=password]').val();

                    var _login = function(cbOk, cbErr) {
                        var data = {
                            email: email,
                            password: password
                        };

                        $.post("/api/login", data, function(data, status) {
                            if (data.success) {
                                cbOk(data);
                            } else {
                                cbErr(data);
                            }
                        })
                    };

                    _login(function(data) {
                        app.session = data.user;
                        app.goToScreen("account");
                        app.message("Welcome " + data.user.fullname);
                    }, function(data) {
                        app.message(data.error, "error");
                    })

                    console.log("Login Handler");
                }
            },
            'register': {
                handler: function(target) {
                    var $formData = $(target);
                    var fullname = $formData.find('[name=fullname]').val(),
                        email = $formData.find('[name=email]').val(),
                        password = $formData.find('[name=password]').val(),
                        confirm = $formData.find('[name=confirm]').val();

                    var _register = function(cbOk, cbErr) {
                        var data = {
                            fullname: fullname,
                            email: email,
                            password: password
                        };

                        $.post("/api/register", data, function(resp) {
                            
                            if (resp.success) {
                                cbOk(resp);
                            } else {
                                cbErr(resp);
                            }
                        })
                    };

                    if (app.validate.password(password, confirm)) {
                        _register(function() {
                            app.goToScreen("login");
                            app.message("Registration successful. You will shortly receive an email activation link", "success");
                        }, function(data) {
                            app.message("Registration error: " + data.error, "error");
                        })

                    }

                    console.log("Register Handler");

                }
            },
            'forgot': {
                handler: function(target) {
                    var $formData = $(target);
                    var email = $formData.find('[name=email]').val();

                    var _forgot = function(cbOk, cbErr) {
                        var data = {
                            email: email
                        };

                        $.post("/api/forgot", data, function(resp, status) {
                            if (resp.success) {
                                cbOk(resp);
                            } else {
                                cbErr(resp);
                            }
                        });
                    };

                    console.log("Forgot Password Handler");

                    _forgot(function(data) {
                        app.goToScreen("login");
                        app.message("You will shortly receive an email with a link to reset your password", "success");
                    }, function(data) {
                        app.message("Unable to reset password: " + data.error, "error");

                    });
                }
            },
            'account': {
                load: function() {
                    if (app.session)
                    {
                        $('#account_info').html(window.tmpl("account_tmpl", app.session));
                    }
                }
            },
            'setpassword': {
                handler: function(target) {
                    var $formData = $(target);
                    var email = app.session.email,
                        password = $formData.find('[name=password]').val(),
                        confirm = $formData.find('[name=confirm]').val();


                    var _reset = function(cbOk, cbErr) {
                        var data = {
                            email: email,
                            password: password
                        };

                        $.post("/api/setpassword", data, function(resp, status) {
                            if (resp.success) {
                                cbOk(resp);
                            } else {
                                cbErr(resp);
                            }
                        }).fail(function(resp, status){
                            cbErr(resp.responseJSON);
                        });
                    };

                    console.log("Set Password Handler");
                    if (app.validate.password(password, confirm)) {
                        _reset(function(data) {
                            app.goToScreen("account");
                            app.message("You have successfully changed your password", "success");
                        }, function(data) {
                            app.message("Unable to change password: " + data.error, "error");

                        });
                    }

                }

            }
        };

        //Attach JS to DOM
        app.initHandlers = function() {

            $screens.find('[data-route]').click(function() {
                var name = $(this).data('route');
                app.goToScreen(name);
            })

            window.addEventListener('popstate', function(e) {
                var dest = (e.state) ? e.state.dest : null;
                app.goToScreen(dest);
            });

        };
        
        
        app.auth = function() {
            return $.ajax("/api/auth");
        };

        
        app.message = function(msg, type) {
            type = type || "info";
            app.clearMessages();
            // console.log("Message >> ", msg, type);
            var classes = [];
            classes.push('msg-' + type);
            if (type == "error")
            {
                classes.push('effect-fadeIn');
            }
            $('.message').removeClass('effect-fadeOut').addClass(classes.join(' ')).show().html(msg);
        }
        app.clearMessages = function() {
            $('.message').addClass('effect-fadeOut').removeClass("msg-success msg-info msg-error").empty();
        }

        //Initialize screens with forms
        //Bind event handlers to screen objects, retain `this` reference
        app.initForms = function(screens) {
            var s;

            for (s in app.screens) {
                var $s = $screens.find('[data-page=' + s + '] >  form');
                
                var submitHandler = function(s) {
                    var sObj = app.screens[s];
                    
                    return function(e)
                    {
                        e.preventDefault();
                        sObj.handler(this);
                    }
                }
                
                $s.submit(submitHandler(s));

            }
        };

        // Router, use HTML5 History API
        app.goToScreen = function(dest) {
            var secure = false,
                $curr, $dest, title;


            if (app.screens[dest]) {
                if (typeof app.screens[dest].load == "function") {
                    app.screens[dest].load();
                }

                $curr = $screens.find('[data-page]:visible');
                $dest = $screens.find('[data-page="' + dest + '"]');

                secure = $dest.data('secure');


                // Hide secure screens
                if ((!secure || (secure && app.session))) {
                    app.clearMessages();

                    title = app.appName + ' - ' + $dest.data('title'), url = '/#' + dest;

                    window.document.title = title;
                    history.pushState({
                        dest: dest
                    }, title, url);

                    $curr.hide();
                    $dest.show();
                }
                else
                {
                    app.goToScreen("login");
                }

            }

        };

    })($, app);

    app.initHandlers();
    app.initForms(app.screens);

    // Authenticate on page load, session cached until refresh/logout
    // If not authenticated, go to login screen
    // If authenticated, go to account screen
    
    app.auth().then(function(result) {

        var msgObj, dest, hash = window.location.hash ? window.location.hash : false;
        
        if (result.success) {
            app.session = result.user;
            dest = hash  ? hash.replace("#","") : "account";
            
        } else {
            app.session = false;
            dest = hash ? hash.replace("#","") : "login";
        }
        
        // Use query strings to pass messages back from server during HTTP redirects
        if (window.location.search.indexOf('msg') > -1)
        {  
            try
            {
                msgObj = window.qs2h(window.location.search.substr(5));
            }
            catch(e){
            }
            
        }
        
        //Start app
        app.goToScreen(dest);
        
        //Display messages sent from server
        if (msgObj)
        {
            app.message(msgObj.msg, msgObj.type);
        }
    });


})