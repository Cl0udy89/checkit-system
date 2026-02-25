#!/bin/bash
# CheckIT OpenVPN Setup Script
# Run this on the central server (Ubuntu/Debian)

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./setup_openvpn.sh)"
  exit 1
fi

echo "Installing OpenVPN and Easy-RSA..."
apt update && apt install -y openvpn easy-rsa

echo "Setting up CA directory..."
make-cadir ~/openvpn-ca
cd ~/openvpn-ca

# Initialize PKI and build CA
./easyrsa init-pki
echo "openvpn" | ./easyrsa build-ca nopass

# Generate server certificate and key
./easyrsa gen-req server nopass
cp pki/private/server.key /etc/openvpn/server/
./easyrsa sign-req server server

# Generate Diffie-Hellman parameters
./easyrsa gen-dh
openvpn --genkey secret ta.key

cp pki/issued/server.crt pki/ca.crt pki/dh.pem ta.key /etc/openvpn/server/

# Configure OpenVPN server
cat <<EOF > /etc/openvpn/server/server.conf
port 1194
proto udp
dev tun
ca ca.crt
cert server.crt
key server.key
dh dh.pem
tls-auth ta.key 0
server 10.8.0.0 255.255.255.0
ifconfig-pool-persist ipp.txt
keepalive 10 120
cipher AES-256-GCM
user nobody
group nogroup
persist-key
persist-tun
status openvpn-status.log
verb 3
explicit-exit-notify 1
EOF

# Enable IP forwarding
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
sysctl -p

# Start the server
systemctl start openvpn-server@server
systemctl enable openvpn-server@server

echo "Generating Client Config for Raspberry Pi..."
./easyrsa gen-req rpi-client nopass
./easyrsa sign-req client rpi-client

mkdir -p ~/client-configs/keys
chmod -R 700 ~/client-configs

cp pki/private/rpi-client.key ~/client-configs/keys/
cp pki/issued/rpi-client.crt ~/client-configs/keys/
cp ta.key ~/client-configs/keys/
cp pki/ca.crt ~/client-configs/keys/

# Create base configuration
cat <<EOF > ~/client-configs/client.ovpn
client
dev tun
proto udp
remote \$(curl -s ifconfig.me) 1194
resolv-retry infinite
nobind
user nobody
group nogroup
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
verb 3
key-direction 1

<ca>
$(cat ~/client-configs/keys/ca.crt)
</ca>
<cert>
$(cat ~/client-configs/keys/rpi-client.crt)
</cert>
<key>
$(cat ~/client-configs/keys/rpi-client.key)
</key>
<tls-auth>
$(cat ~/client-configs/keys/ta.key)
</tls-auth>
EOF

echo "Setup Complete! Client configuration is available at: ~/client-configs/client.ovpn"
echo "Transfer client.ovpn to the Raspberry Pi and run: sudo openvpn --config client.ovpn"
