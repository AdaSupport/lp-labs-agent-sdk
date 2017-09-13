/*
 * @author Yariv Rosenbach
 * @repository https://github.com/yarivr/lp-labs-agent-sdk
 * Copyright 2016 LivePerson Inc - MIT license
 * https://github.com/yarivr/lp-labs-agent-sdk/LICENSE.md
 */
"use strict";

let request = require('request');
let config = require('../conf/conf.json');
let services = new Map();

function LPCSDS() {
    function getAllServices(brandid, services) {
        let _getServices = function(domain, brandid, services) {
            let options = {
                url: 'http://' + domain + '/csdr/account/' + brandid + '/service/baseURI.json?version=1.0',
                method: 'GET'
            };

            return new Promise((resolve, reject) => {
                request(options, function (error, response, body) {
                    if (error) {
                        reject(error);
                    } else {
                        try {
                            let jresult = JSON.parse(response.body);
                            if (!jresult.baseURIs || !jresult.baseURIs.length) {
                                reject('No BaseURI');
                            } else if (jresult.baseURIs.length > 0) {
                                let result = {};
                                let baseURIs = jresult.baseURIs;

                                baseURIs.forEach((baseURI) => {
                                    if (services.indexOf(baseURI.service) > -1) {
                                        result[baseURI.service] = baseURI.baseURI;
                                    }
                                });
                                
                                resolve(result);
                            }
                        } catch(e) {
                            reject(e);
                        }
                    }

                })
            });
        }

        return _getServices(config.csds.prodDomain, brandid, services).catch(() => {
            return  _getServices(config.csds.devDomain, brandid, services);
        });
    }

    let api = {
        getServices: (brandid) => {
            return new Promise((resolve, reject) => {
                if (services.has(brandid)) {
                    resolve(services.get(brandid));
                } else {
                    getAllServices(brandid, ['adminArea', 'liveEngage', 'asyncMessagingEnt']).then((result) => {
                        let brandServices = {
                            adminAreaUrl: 'https://' + result.adminArea + '/hc/s-' + brandid + '/web/m-LP/mlogin/home.jsp',
                            liveEngageUrl: 'https://' + result.liveEngage + '/le/account/' + brandid + '/session',
                            asyncMessagingEnt: 'wss://' + result.asyncMessagingEnt
                        }

                        services.set(brandid, brandServices);

                        setTimeout(()=> {
                            services.delete(brandid);
                        }, config.csds.ttl);

                        resolve(brandServices);
                    });
                }
            });
        }
    };

    return api;
}

let api =  LPCSDS();

module.exports = LPCSDS();