const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
let _db;

const mongoConnect = (callback) => {
        MongoClient.connect(
                'mongodb+srv://user_1:pHk6nhwkkL14tOz4@udemy-cluster.qubpg.mongodb.net/shop?retryWrites=true&w=majority'
        ).then((client)=>{
                _db = client.db();
                console.log('Connected');
                callback();
        }).catch(err=>{
                console.log(err);
        });
};

const getDb = () => {
  if (_db) {
    return _db;
  }
  throw "No DB found!";
};
exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
