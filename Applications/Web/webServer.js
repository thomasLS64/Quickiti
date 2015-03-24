var express = require('express'),
	socketServeurCentral = require('socket.io-client')('http://localhost:8008/'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	forms = require('forms'),
	fields = forms.fields,
	validators = forms.validators,
	widgets = forms.widgets,
	port = 8080;

server.listen(port, function() {
	console.log('Le serveur web écoute sur le port %d', port);
});

// Dossier contenant l'application web
app.use(express.static(__dirname + '/public'))
	.get('/inscription/', function (req, res) {
		console.log(my_form.toHTML());
		res.render('pages/inscription.ejs', { formulaireInscription: my_form });
	})

	.post('/inscription/', function(req, res) {
		my_form.handle(req, {
			success: function (form) {
				// there is a request and the form is valid
				// form.data contains the submitted data
			},
			error: function (form) {
				// the data in the request didn't validate,
				// calling form.toHTML() again will render the error messages
			},
			empty: function (form) {
				// there was no form data in the request
			}
		});
	});
// Serveur de socket de l'application web
io.on('connection', function(socket) {
	console.log('Nouveau client');
	socket.on('request', function(requestType, request, callback) {
		console.log('Requête client');
		socketServeurCentral.emit('clientRequest', requestType, request, callback);
	});
});
var my_form = forms.create({
	title: fields.string({
		required: true,
		widget: widgets.text({ classes: ['input-with-feedback'] }),
		errorAfterField: true,
		cssClasses: {
			label: ['control-label col col-lg-3']
		}
	}),
	description: fields.string({
		errorAfterField: true,
		widget: widgets.text({ classes: ['input-with-feedback'] }),
		cssClasses: {
			label: ['control-label col col-lg-3']
		}
	})
});
//Comptatibilité de la bibliotèque forms avec bootstrap
var bootstrapField = function (name, object) {
	object.widget.classes = object.widget.classes || [];
	object.widget.classes.push('form-control');

	var label = object.labelHTML(name);
	var error = object.error ? '<div class="alert alert-error help-block">' + object.error + '</div>' : '';

	var validationclass = object.value && !object.error ? 'has-success' : '';
	validationclass = object.error ? 'has-error' : validationclass;

	var widget = object.widget.toHTML(name, object);
	return '<div class="form-group ' + validationclass + '">' + label + widget + error + '</div>';
};