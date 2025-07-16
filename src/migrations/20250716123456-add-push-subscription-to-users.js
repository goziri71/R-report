export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn("Users", "pushSubscription", {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: null,
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn("Users", "pushSubscription");
};
