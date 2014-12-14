# Codius host

**NOT READY FOR PRODUCTION USE**

This is a prototype implementation of a Codius host. Codius hosts run contracts and provide them with APIs that allow for key generation, interaction with outside systems and lots more! Please keep in mind that is an early prototype and it's still missing a lot of functionality for it to be secure, stable and useful.

## Installation

``` sh
git clone git@github.com:codius/codius-host.git
cd codius-host
npm install
node app
```

## Now what?

To interact with your Codius host, checkout the [Codius CLI](https://github.com/codius/codius-cli).

## Screenshot

![](http://i.imgur.com/xeenOSM.png)

# Setting up a local Codius host for testing

## Certificate

First, you need to generate a self-signed certificate. For example, using OpenSSL:

``` sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
```

## Hostname

In order to use a local Codius host, you need to redirect requests like abcabc-abcabc-abcabc.example.com to your local host. Unfortunately, `/etc/hosts` does not allow you to specify wildcard hosts.

On Ubuntu, an easy way to get around this problem is using `dnsmasq`.

``` sh
sudo apt-get install dnsmasq
echo 'address=/localcodius/127.0.0.1' | sudo tee --append /etc/dnsmasq.conf
sudo /etc/init.d/dnsmasq restart
```

Afterwards, configure your Codius host to use "localcodius" as its hostname. You'll be able to access local contracts using URLs like https://abcabc-abcabc-abcabc.localcodius:2633.

## Registering with the host

Hosts use [Ed25519](http://ed25519.cr.yp.to/) public keys to identify users.

### `POST /user`

#### Request

```js
{
  "public_key": "jRYkLrNGob3TqxJsvhSll3BE8pE2w8VmOXzB6cs1nFk="
}
```

This request must be signed with the [Ed25519 version](https://github.com/codius/node-http-signature) of the HTTP Signature Scheme.

#### Response

```js
{
  "public_key": "jRYkLrNGob3TqxJsvhSll3BE8pE2w8VmOXzB6cs1nFk=",
  "bitcoin_address": "12KurTLijZDM3rJUxPccpJhXBc3ccrWQ3h",
  "compute_units": 100000,
  "compute_units_per_bitcoin": 100000000
}
```

+ `public_key` - the user's Ed25519 public key
+ `bitcoin_address` - the address that the user must pay to fund their account
+ `compute_units` - the user's balance with the host
+ `compute_units_per_bitcoin` - the cost per compute unit in Bitcoin