import { Accounts } from 'meteor/accounts-base';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { jQuery } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';
import './Register_page.html';

const Images = new FilesCollection({
  debug: true,
  collectionName: 'Images',
  allowClientCode: false, // Disallow remove files from Client
  onBeforeUpload: function (file) {
    // Allow upload files under 10MB, and only in png/jpg/jpeg formats
    if (file.size <= 1024 * 1024 * 10 && /png|jpe?g/i.test(file.extension)) {
      return true;
    }
    return 'Please upload image, with size equal or less than 10MB';
  }
});

Template.uploadedFiles.helpers({
  uploadedFiles: function () {
    return Images.find();
  }
});

Template.uploadForm.onCreated(function () {
  this.currentUpload = new ReactiveVar(false);
});

Template.uploadForm.helpers({
  currentUpload: function () {
    return Template.instance().currentUpload.get();
  }
});

Template.uploadForm.events({
  'change #fileInput': function (e, template) {
    if (e.currentTarget.files && e.currentTarget.files[0]) {
      // We upload only one file, in case
      // there was multiple files selected
      var file = e.currentTarget.files[0];
      if (file) {
        var uploadInstance = Images.insert({
          file: file,
          streams: 'dynamic',
          chunkSize: 'dynamic'
        }, false);

        uploadInstance.on('start', function() {
          template.currentUpload.set(this);
        });

        uploadInstance.on('end', function(error, fileObj) {
          if (error) {
            window.alert('Error during upload: ' + error.reason);
          } else {
            window.alert('File "' + fileObj.name + '" successfully uploaded');
          }
          template.currentUpload.set(false);
        });

        uploadInstance.start();
      }
    }
  }
});

if (Meteor.isClient) {
  Meteor.subscribe('files.images.all');


  Template.Register.events({
    'submit .register': function registerUser(event) {
      event.preventDefault();
    },
  });
  // Rules and custom messages for form validation
  $.validator.setDefaults({
    rules: {
      registerUsername: {
        required: true,
        minlength: 3,
      },
      registerEmail: {
        required: true,
        email: true,
      },
      registerPassword: {
        required: true,
        minlength: 5,
      },
      registerPassword2: {
        required: true,
        equalTo: '#registerPassword',
      },
      registerTerms: {
        required: true,
      },
    },
    messages: {
      registerUsername: {
        required: 'Please enter a username',
        minlength: 'Your username must consist of at least 3 characters',
      },
      registerEmail: 'Please enter a valid email address',
      registerPassword: {
        required: 'Please provide a password',
        minlength: 'Your password must be at least 5 characters long',
      },
      registerPassword2: {
        required: 'Please provide a password',
        minlength: 'Your password must be at least 5 characters long',
        equalTo: 'Please enter the same password as above',
      },
      registerTerms: 'You must agree to the service terms!',
    },
  });

  Template.Register.onRendered(() => {
    const validator = $('#registerForm').validate({
      // Add classes to validation display
      errorClass: 'help-block text-right animated fadeInDown',
      errorElement: 'div',
      errorPlacement: function errorPlacement(error, e) {
        jQuery(e).parents('.form-group > div').append(error);
      },
      highlight: function highlight(e) {
        jQuery(e).closest('.form-group').removeClass('has-error').addClass('has-error');
        jQuery(e).closest('.help-block').remove();
      },
      success: function success(e) {
        jQuery(e).closest('.form-group').removeClass('has-error');
        jQuery(e).closest('.help-block').remove();
      },
      // Handle form submit
      submitHandler: function submitHandler(e) {
        // Get value from form element
        const usernameVar = $('[name=registerUsername]').val();
        const emailVar = $('[name=registerEmail]').val();
        const passwordVar = $('[name=registerPassword]').val();

        // Register new User
        Accounts.createUser({
          username: usernameVar,
          email: emailVar,
          password: passwordVar,
        }, (error) => {
          if (error) {
            validator.showErrors({
              registerUsername: error.reason,
            });
          } else {
            FlowRouter.go('/home');
          }
        });
      },
    });
  });
  if (Meteor.isServer) {
    Images.denyClient();
    Meteor.publish('files.images.all', function () {
      return Images.find().cursor;
    });
  } else {
    Meteor.subscribe('files.images.all');
  }
  
  export default Images;
}