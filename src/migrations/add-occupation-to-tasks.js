module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("tasks", "occupation", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("tasks", "occupation");
  },
};
