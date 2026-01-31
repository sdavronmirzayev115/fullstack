const getRandomAvatar = () => {
  const randomNumber = Math.floor(Math.random() * 7) + 1;
  return `/public/avatars/avatar${randomNumber}.jpg`;
};

module.exports = getRandomAvatar;
