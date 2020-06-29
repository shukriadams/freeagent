#!/usr/bin/env bash
sudo apt-get update

# install latest version of git
sudo apt-add-repository ppa:git-core/ppa
sudo apt-get update
sudo apt-get install git

#install node js
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install nodejs  -y

# docker
sudo apt install docker.io -y
sudo apt install docker-compose -y
sudo usermod -aG docker vagrant

sudo npm install -g pkg 


# force startup folder to vagrant project
echo "cd /vagrant/src" >> /home/vagrant/.bashrc

# set hostname, makes console easier to identify
sudo echo "freeagent" > /etc/hostname
sudo echo "127.0.0.1 freeagent" >> /etc/hosts
