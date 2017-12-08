
CrowdsaleLib - WIP DON'T USE
=========================

[![Build Status](https://travis-ci.org/Majoolr/ethereum-libraries.svg?branch=master)](https://travis-ci.org/Majoolr/ethereum-libraries)
[![Join the chat at https://gitter.im/Majoolr/EthereumLibraries](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/Majoolr/EthereumLibraries?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Crowdsale libraries [provided by Majoolr](https://github.com/Majoolr "Majoolr's Github") to use for crowdsale contract deployment.

## Library Address

### CrowdsaleLib   

### v2.0.0

**ENS**: TBD   
**Main Ethereum Network**:
**Rinkeby Test Network**:
**Ropsten Test Network**:   

## How to Use

The CrowdsaleLib is made up of several libraries, each catered toward a specific type of crowdsale. To create a crowdsale contract developers should decide what type of crowdsale best suits their need from the descriptions below and then dive into that directory. Every crowdsale library uses the CrowdsaleLib.sol and CrowdsaleLib.json files found here in this directory as a base contract and you should place these files in your project.

## Crowdsale Types

### Direct Crowdsale

The DirectCrowdsale is for sales that have a high supply of tokens relative to demand and do not anticipate a rush into the auction. This is the simplest of crowdsales and provides mechanisms for a basic eth-in/token-out auction.

### Even Distribution Crowdsale

The EvenDistroCrowdsale is for auctions that pre-register buyers before the sale and only allow white-listed addresses to participate. The sale owners have up to three days before the sale to register all participating addresses. Additionally, each address will have either a static purchase cap set or a dynamically generated cap based on the number of registrants and total raise cap.

## License and Warranty

Be advised that while we strive to provide professional grade, tested code we cannot guarantee its fitness for your application. This is released under [The MIT License (MIT)](https://github.com/Majoolr/ethereum-libraries/blob/master/LICENSE "MIT License") and as such we will not be held liable for lost funds, etc. Please use your best judgment and note the following:

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Change Log

### v2.0.0

* This version changes the sale data structure for all crowdsales.
