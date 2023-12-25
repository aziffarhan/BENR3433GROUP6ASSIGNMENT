const express = require('express');
const YAML = require('yamljs')
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const {MongoClient, ObjectId} = require('mongodb');
const MongoURI = process.env.MongoDB
const port = process.env.PORT || 1947;

app.use(cors());

const swaggerDocument = YAML.load('swagger-api.yaml');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyVMS API',
      version: '1.0.0',
    },
  },
  apis: ['./main.js'],
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

// MongoDB connection URI
const uri = 'mongodb+srv://aziffarhan:Briareos%401947@aziffarhan.idaggst.mongodb.net/VisitorManagementSystem';

// Connect to MongoDB
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');

    // Get the admin and visitors collections
    const db = client.db('VisitorManagementSystem');
    const adminCollection = db.collection('admin');
    const userCollection = db.collection('user');
    const visitorsInfoCollection = db.collection('visitorsInfo');
    const visitorsAddressCollection = db.collection('visitorsAddress');
    const visitorsRegistrationCollection = db.collection('visitorsRegistration');
    const otherDetailsCollection = db.collection('otherDetails');
    const visitDetailsCollection = db.collection('visitDetails');
    const additionalInfoCollection = db.collection('addInfo');
    const blacklistStatusCollection = db.collection('blacklistStatus');

    // Helper functions
    function login(reqUsername, reqPassword) {
      return adminCollection.findOne({ username: reqUsername, password: reqPassword })
        .then(matchAdmin => {
          if (!matchAdmin) {
            return {
              success: false,
              message: "Admin not found!"
            };
          } else {
            return {
              success: true,
              admin: matchAdmin
            };
          }
        })
        .catch(error => {
          console.error('Error in login:', error);
          return {
            success: false,
            message: "An error occurred during login."
          };
        });
    }

    // User login function
    function loginUser(reqUsername, reqPassword) {
      return userCollection.findOne({ username: reqUsername, password: reqPassword })
        .then(matchUser => {
          if (!matchUser) {
            return {
              success: false,
              message: "User not found!"
            };
          } else {
            return {
              success: true
            };
          }
        })
        .catch(error => {
          console.error('Error in user login:', error);
          return {
            success: false,
            message: "An error occurred during user login."
          };
        });
    }
    
    // Admin registration function
    function register(reqUsername, reqPassword, reqName, reqEmail) {
      return adminCollection.insertOne({
        username: reqUsername,
        password: reqPassword,
        name: reqName,
        email: reqEmail
      })
        .then(() => {
          return "Registration successful!";
        })
        .catch(error => {
          console.error('Error in register:', error);
          return "An error occurred during registration.";
        });
    }

    // User registration function
    function registerUser(reqUsername, reqPassword, reqName, reqEmail) {
      return userCollection.insertOne({
        username: reqUsername,
        password: reqPassword,
        name: reqName,
        email: reqEmail
      })
        .then(() => {
          return "User registration successful!";
        })
        .catch(error => {
          console.error('Error in user registration:', error);
          return "An error occurred during user registration.";
        });
    }

    function generateToken(adminData) {
      const token = jwt.sign(
        adminData,
        'ayamguring',
        { expiresIn: '1h' }
      );
      return token;
    }    

    function verifyToken(req, res, next) {
      let header = req.headers.authorization;
    
      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).send('Invalid Token');
      }
    
      let token = header.split(' ')[1];
    
      jwt.verify(token, 'ayamguring', function (err, decoded) {
        if (err) {
          return res.status(401).send('Invalid Token');
        }
        req.admin = decoded;
        next();
      });
    }
    

    // Login route
    app.post('/login', (req, res) => {
      console.log(req.body);

      let result = login(req.body.username, req.body.password);
      result.then(response => {
        if (response.success) {
          let token = generateToken(response.admin);
          res.send(token);
        } else {
          res.status(401).send(response.message);
        }
      }).catch(error => {
        console.error('Error in login route:', error);
        res.status(500).send("An error occurred during login.");
      });
    });

    // User login route
    app.post('/user/login', (req, res) => {
      console.log(req.body);

      let result = loginUser(req.body.username, req.body.password);
      result.then(response => {
        if (response.success) {
          res.send('User login successful!');
        } else {
          res.status(401).send(response.message);
        }
      }).catch(error => {
        console.error('Error in user login route:', error);
        res.status(500).send("An error occurred during user login.");
      });
    });

    // Register route
    app.post('/register', (req, res) => {
      console.log(req.body);

      let result = register(req.body.username, req.body.password, req.body.name, req.body.email);
      result.then(response => {
        res.send(response);
      }).catch(error => {
        console.error('Error in register route:', error);
        res.status(500).send("An error occurred during registration.");
      });
    });

    // Create user route
    app.post('/user/register', (req, res) => {
      console.log(req.body);

      let result = registerUser(req.body.username, req.body.password, req.body.name, req.body.email);
      result.then(response => {
        res.send(response);
      }).catch(error => {
        console.error('Error in user registration route:', error);
        res.status(500).send("An error occurred during user registration.");
      });
    });

    // Create visitorsRegistration route without token verification
    app.post('/visitorsRegistration', (req, res) => {
      const visitorRegistrationData = req.body;

      const visitorInfo = visitorRegistrationData.visitorInfo;
      const visitorAddress = visitorRegistrationData.visitorAddress;
      const otherDetails = visitorRegistrationData.otherDetails;
      const visitDetails = visitorRegistrationData.visitDetails;
      const addInfo = visitorRegistrationData.addInfo;
      const blacklistStatus = visitorRegistrationData.blacklistStatus;

      Promise.all([
        visitorsInfoCollection.insertOne(visitorInfo),
        visitorsAddressCollection.insertOne(visitorAddress),
        otherDetailsCollection.insertOne(otherDetails),
        visitDetailsCollection.insertOne(visitDetails),
        additionalInfoCollection.insertOne(addInfo),
        blacklistStatusCollection.insertOne(blacklistStatus)
      ])
        .then(() => {
          const visitorsRegistrationData = {
            visitorInfoId: visitorInfo._id,
            visitorAddressId: visitorAddress._id,
            otherDetailsId: otherDetails._id,
            visitDetailsId: visitDetails._id,
            addInfoId: addInfo._id,
            blacklistStatusId: blacklistStatus._id
          };

          return visitorsRegistrationCollection.insertOne(visitorsRegistrationData);
        })
        .then(() => {
          res.send('Visitor registration created successfully');
        })
        .catch(error => {
          console.error('Error creating visitor registration:', error);
          res.status(500).send('An error occurred while creating the visitor registration');
        });
    });

    // Create visitorsInfo route
    app.post('/visitorsInfo', verifyToken, (req, res) => {
      const visitorInfo = req.body;
      visitorsInfoCollection.insertOne(visitorInfo)
        .then(() => {
          res.send('Visitor info created successfully');
        })
        .catch(error => {
          console.error('Error creating visitor:', error);
          res.status(500).send('An error occurred while creating the visitor info');
        });
    });
    
    // Create visitorsAddress route
    app.post('/visitorsAddress', verifyToken, (req, res) => {
      const visitorAddress = req.body;
      visitorsAddressCollection.insertOne(visitorAddress)
        .then(() => {
          res.send('Visitor address created successfully');
        })
        .catch(error => {
          console.error('Error creating visitor:', error);
          res.status(500).send('An error occurred while creating the visitor address');
        });
    });

    // Create otherDetails route
    app.post('/otherDetails', verifyToken, (req, res) => {
      const otherDetails = req.body;
      otherDetailsCollection.insertOne(otherDetails)
        .then(() => {
          res.send('Other details created successfully');
        })
        .catch(error => {
          console.error('Error creating other details:', error);
          res.status(500).send('An error occurred while creating other details');
        });
    });

    // Create visitDetails route
    app.post('/visitDetails', verifyToken, (req, res) => {
      const visitDetails = req.body;
      visitDetailsCollection.insertOne(visitDetails)
        .then(() => {
          res.send('Visit details created successfully');
        })
        .catch(error => {
          console.error('Error creating visit details:', error);
          res.status(500).send('An error occurred while creating visit details');
        });
    });

    // Create addInfo route
    app.post('/addInfo', verifyToken, (req, res) => {
      const addInfo = req.body;
      additionalInfoCollection.insertOne(addInfo)
        .then(() => {
          res.send('Additional info created successfully');
        })
        .catch(error => {
          console.error('Error creating additional info:', error);
          res.status(500).send('An error occurred while creating additional info');
        });
    });

    // Create blacklistStatus route
    app.post('/blacklistStatus', verifyToken, (req, res) => {
      const blacklistStatus = req.body;
      blacklistStatusCollection.insertOne(blacklistStatus)
        .then(() => {
          res.send('Blacklist status created successfully');
        })
        .catch(error => {
          console.error('Error creating blacklist status:', error);
          res.status(500).send('An error occurred while creating blacklist status');
        });
    });

    // Read the visitorsRegistration route
    app.get('/visitorsRegistration', verifyToken, (req, res) => {
      visitorsRegistrationCollection.find().toArray()
        .then(visitors => {
          res.json(visitors);
        })
        .catch(error => {
          console.error('Error retrieving visitor registrations:', error);
          res.status(500).send('An error occurred while retrieving visitor registrations');
        });
    });

    // Read the visitorsInfo route
    app.get('/visitorsInfo', verifyToken, (req, res) => {
      visitorsInfoCollection.find().toArray()
        .then(visitors => {
          res.json(visitors);
        })
        .catch(error => {
          console.error('Error retrieving visitor information:', error);
          res.status(500).send('An error occurred while retrieving visitor information');
        });
    });

    // Read the visitorsAddress route
    app.get('/visitorsAddress', verifyToken, (req, res) => {
      visitorsAddressCollection.find().toArray()
        .then(visitors => {
          res.json(visitors);
        })
        .catch(error => {
          console.error('Error retrieving visitor address:', error);
          res.status(500).send('An error occurred while retrieving visitor address');
        });
    });

    // Read the otherDetails route
    app.get('/otherDetails', verifyToken, (req, res) => {
      otherDetailsCollection.find().toArray()
        .then(visitors => {
          res.json(visitors);
        })
        .catch(error => {
          console.error('Error retrieving other details:', error);
          res.status(500).send('An error occurred while retrieving other details');
        });
    });

    // Read the visitDetails route
    app.get('/visitDetails', verifyToken, (req, res) => {
      visitDetailsCollection.find().toArray()
        .then(visitors => {
          res.json(visitors);
        })
        .catch(error => {
          console.error('Error retrieving visit details:', error);
          res.status(500).send('An error occurred while retrieving visit details');
        });
    });

    // Read the addInfo route
    app.get('/addInfo', verifyToken, (req, res) => {
      additionalInfoCollection.find().toArray()
        .then(visitors => {
          res.json(visitors);
        })
        .catch(error => {
          console.error('Error retrieving additional information:', error);
          res.status(500).send('An error occurred while retrieving additional information');
        });
    });

    // Read the blacklistStatus route
    app.get('/blacklistStatus', verifyToken, (req, res) => {
      blacklistStatusCollection.find().toArray()
        .then(visitors => {
          res.json(visitors);
        })
        .catch(error => {
          console.error('Error retrieving blacklist status:', error);
          res.status(500).send('An error occurred while retrieving blacklist status');
        });
    });

    const { ObjectId } = require('mongodb');

    // Update visitorsInfo route
    app.patch('/visitorsInfo/:id', verifyToken, (req, res) => {
      const visitorId = req.params.id;
      const updateData = req.body;

      visitorsInfoCollection
        .updateOne({ _id: new ObjectId(visitorId) }, { $set: updateData })
        .then(() => {
          res.send('Visitor info updated successfully');
        })
        .catch(error => {
          console.error('Error updating visitor info:', error);
          res.status(500).send('An error occurred while updating the visitor info');
        });
    });

    // Update visitorsAddress route
    app.patch('/visitorsAddress/:id', verifyToken, (req, res) => {
      const addressId = req.params.id;
      const updateData = req.body;

      visitorsAddressCollection
        .updateOne({ _id: new ObjectId(addressId) }, { $set: updateData })
        .then(() => {
          res.send('Visitor address updated successfully');
        })
        .catch(error => {
          console.error('Error updating visitor address:', error);
          res.status(500).send('An error occurred while updating the visitor address');
        });
    });

    // Update otherDetails route
    app.patch('/otherDetails/:id', verifyToken, (req, res) => {
      const detailsId = req.params.id;
      const updateData = req.body;

      otherDetailsCollection
        .updateOne({ _id: new ObjectId(detailsId) }, { $set: updateData })
        .then(() => {
          res.send('Other details updated successfully');
        })
        .catch(error => {
          console.error('Error updating other details:', error);
          res.status(500).send('An error occurred while updating the other details');
        });
    });

    // Update visitDetails route
    app.patch('/visitDetails/:id', verifyToken, (req, res) => {
      const visitId = req.params.id;
      const updateData = req.body;

      visitDetailsCollection
        .updateOne({ _id: new ObjectId(visitId) }, { $set: updateData })
        .then(() => {
          res.send('Visit details updated successfully');
        })
        .catch(error => {
          console.error('Error updating visit details:', error);
          res.status(500).send('An error occurred while updating the visit details');
        });
    });

    // Update addInfo route
    app.patch('/addInfo/:id', verifyToken, (req, res) => {
      const infoId = req.params.id;
      const updateData = req.body;

      additionalInfoCollection
        .updateOne({ _id: new ObjectId(infoId) }, { $set: updateData })
        .then(() => {
          res.send('Additional info updated successfully');
        })
        .catch(error => {
          console.error('Error updating additional info:', error);
          res.status(500).send('An error occurred while updating the additional info');
        });
    });

    // Update blacklistStatus route
    app.patch('/blacklistStatus/:id', verifyToken, (req, res) => {
      const statusId = req.params.id;
      const updateData = req.body;

      blacklistStatusCollection
        .updateOne({ _id: new ObjectId(statusId) }, { $set: updateData })
        .then(() => {
          res.send('Blacklist status updated successfully');
        })
        .catch(error => {
          console.error('Error updating blacklist status:', error);
          res.status(500).send('An error occurred while updating the blacklist status');
        });
    });

    // Delete visitorsRegistration route
    app.delete('/visitorsRegistration/:id', verifyToken, (req, res) => {
      const visitorRegistrationId = req.params.id;

      // Find the visitor registration document
      visitorsRegistrationCollection.findOne({ _id: new ObjectId(visitorRegistrationId) })
        .then(visitorRegistration => {
          if (!visitorRegistration) {
            return res.status(404).send('Visitor registration not found');
          }

          // Delete the visitor registration document
          visitorsRegistrationCollection.deleteOne({ _id: new ObjectId(visitorRegistrationId) })
            .then(deleteResult => {
              if (deleteResult.deletedCount === 0) {
                return res.status(404).send('Visitor registration not found');
              }

              // Delete related documents from other collections
              const promises = [];

              promises.push(
                visitorsInfoCollection.deleteOne({ _id: new ObjectId(visitorRegistration.visitorInfoId) }),
                visitorsAddressCollection.deleteOne({ _id: new ObjectId(visitorRegistration.visitorAddressId) }),
                otherDetailsCollection.deleteOne({ _id: new ObjectId(visitorRegistration.otherDetailsId) }),
                visitDetailsCollection.deleteOne({ _id: new ObjectId(visitorRegistration.visitDetailsId) }),
                additionalInfoCollection.deleteOne({ _id: new ObjectId(visitorRegistration.addInfoId) }),
                blacklistStatusCollection.deleteOne({ _id: new ObjectId(visitorRegistration.blacklistStatusId) })
              );

              // Wait for all delete operations to complete
              Promise.all(promises)
                .then(() => {
                  res.send('Visitor registration and related documents deleted successfully');
                })
                .catch(error => {
                  console.error('Error deleting related documents:', error);
                  res.status(500).send('An error occurred while deleting related documents');
                });
            })
            .catch(error => {
              console.error('Error deleting visitor registration:', error);
              res.status(500).send('An error occurred while deleting the visitor registration');
            });
        })
        .catch(error => {
          console.error('Error finding visitor registration:', error);
          res.status(500).send('An error occurred while finding the visitor registration');
        });
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  });