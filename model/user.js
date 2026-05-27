const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: function () {
                return this.authProvider === "local";
            },
        },

        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
        },

        role: {
            type: String,
            enum: ["creator", "contributor", "admin"],
            default: "creator",
        },

        googleId: {
            type: String,
            sparse: true,
            unique: true,
        },

        avatar: {
            type: String,
        },

        lastLoginAt: {
            type: Date,
        },
        
        collaborators: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
    },
    {
        timestamps: true,
    }
);

const MongooseUserModel = mongoose.models.User || mongoose.model("User", userSchema);

// In-memory mock storage
const mockUsers = [];

class MockUserModel {
    constructor(data) {
        this._id = data._id || new mongoose.Types.ObjectId().toString();
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || "creator";
        this.authProvider = data.authProvider || "local";
        this.collaborators = data.collaborators || [];
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.lastLoginAt = data.lastLoginAt;
    }

    async save() {
        const existing = mockUsers.find(u => u.email === this.email);
        if (existing) {
            Object.assign(existing, this);
        } else {
            mockUsers.push(this);
        }
        return this;
    }

    static async findOne(query) {
        let found = null;
        if (query.email) {
            found = mockUsers.find(u => u.email === query.email);
        }
        return found ? new MockUserModel(found) : null;
    }

    static async create(data) {
        const user = new MockUserModel(data);
        await user.save();
        return user;
    }

    static findById(id) {
        const found = mockUsers.find(u => u._id === id || u.id === id);
        const result = found ? new MockUserModel(found) : null;
        
        return {
            select: function() {
                return {
                    lean: function() {
                        return result;
                    },
                    then: function(resolve) {
                        resolve(result);
                    }
                };
            },
            lean: function() {
                return result;
            },
            then: function(resolve) {
                resolve(result);
            }
        };
    }
}

// Pre-seed the test user in Mock DB so login works immediately
(async () => {
    const hashed = await bcrypt.hash("Password123!", 10);
    mockUsers.push({
        _id: "000000000000000000000001",
        name: "Test User",
        email: "test@local.com",
        password: hashed,
        role: "creator",
        authProvider: "local",
        createdAt: new Date(),
        updatedAt: new Date()
    });
})();

function getActiveUserModel() {
    return process.env.USE_MOCK_DB === "true"
        ? MockUserModel
        : MongooseUserModel;
}

function UserModel(data) {
    const ActiveUserModel = getActiveUserModel();
    return new ActiveUserModel(data);
}

UserModel.findOne = (...args) => getActiveUserModel().findOne(...args);
UserModel.create = (...args) => getActiveUserModel().create(...args);
UserModel.findById = (...args) => getActiveUserModel().findById(...args);

module.exports = UserModel;
