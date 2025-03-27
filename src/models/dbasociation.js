import { User } from "./auth/index.js";
import { Incident } from "./incedent/index.js";

const setupAssociations = () => {
  User.hasMany(Incident, { foreignKey: "userId" });
  Incident.belongsTo(User, { foreignKey: "userId" });
};

export default setupAssociations;
