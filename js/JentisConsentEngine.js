/**
 * The JENTIS consent engine
 *
 * The JENTIS consent engine is the central API component 
 * on page to communicate with all other consent components.
 * 
 */
window.jentis = window.jentis || {};
window.jentis.consent = window.jentis.consent || {};

window.jentis.consent.engine = new function ()
{
	//*************************
	//*************************
	//INIT FUNCTION
	//*************************
	//*************************
		
	/**
	* While Loading we want to init all the consent and vendor status.	
	*/	
	this.init = function ()
	{

		if(typeof window.jentis.consent.config !== "undefined")
		{
			
			if(Object.keys(window.jentis.consent.config.vendors).length === 0)
			{
				window.jentis.consent.config.vendors = {
						"*" : {
							"vendor" : {
								"id"      : "*",
								"name"    : "",
								"street"  : "",
								"zip"     : "",
								"country" : {
									"iso"   : "-",
									"name"  : ""
								}
							},
							"purpose" : {
								"id"    : "other",
								"name"  : "Other"
							},
							"justification" : {
								"id"    : "other",
								"name"  : "other"
							},
							"deniable"	: false,
							"description" : ""
						}
					};		
			}			
			
			this.oLocalConfData = window.jentis.consent.config;
		}			
		else
		{
			console.log("jentis.consent.engine config not found - fallback config");
			this.oLocalConfData = {	
				timeoutBarShow : -1,	
				backward : {},
				bModeStartInitTrackOnJustificationOther : true,
				template : {},
				vendors : 
				{
					"*" : {
						"vendor" : {
							"id"      : "*",
							"name"    : "",
							"street"  : "",
							"zip"     : "",
							"country" : {
								"iso"   : "-",
								"name"  : ""
							}
						},
						"purpose" : {
							"id"    : "other",
							"name"  : "Other"
						},
						"justification" : {
							"id"    : "other",
							"name"  : "other"
						},
						"deniable"	: false,
						"description" : ""
					}
				}		
			}	
			
		}
		
		//Global variables
		this.aEventCache		= {};				//Event Cache for async Callback				
		this.bNewVendorConsent 	= false;			//Bool, gibt an ob in der Congig Tools gefunden wurden die noch nicht im Storage sind.
				
		this.sConsentId 		= false;			//Current ConsentID
		this.bUserConsent 		= false;			//If true, the consent was given from the user, if false, the consent was given without the user (justification and bModeStartInitTrackOnJustificationOther)
		this.iLastUpdate 		= false;			//Date in Unixtimestamp when the last save happend.
		this.bSend				= false;			//true if the consent is send, false if never before send. Important for migration.
		this.aStorage 			= {};				//List of bools for each pixel from the loca storage
		this.aInitStorage 		= {};				//List of bools for each pixel (Status since the last save action)

		this.bStartTrack			= null;				//Current Status if allready started to track.
		this.bIsLocalStorageAvailable = this.checkLocalStorage();	// Check if LocalStorage is available

		//Check if we are within a iframe
		this.bIframe = window.self !== window.top;

		//Start with init processing
		this.readStorage();		
		this.init_eventlistener();
		this.init_consentStatus();
		var bBarShow = this.checkifBarShow();
		this.startJentisTracking(bBarShow);
	}
	
	
	//*************************
	//*************************
	//HELPER FUNCTION FOR INIT
	//*************************
	//*************************

	this.checkLocalStorage = function() {
		var test = 'test';
		try {
			localStorage.setItem(test, test);
			localStorage.removeItem(test);
			return true;
		} catch(e) {
			return false;
		}
	}

	/**
	* Checks if we want to start tracking. If the consentbar is currently showen, then we do not start tracking.
	* If we have at least one positive consent, then we start tracking.
	*
	*@param bool bBarShow Pass if the consentbar is currently showen.
	*/
	this.startJentisTracking = function(bBarShow)
	{
		var bTrack = false;
		for (var sVendorId in this.oLocalConfData.vendors)
		{
			var oVendorConfig = this.oLocalConfData.vendors[ sVendorId ];
		
			if(oVendorConfig.justification.id === "consent")					
			{				
				//if the Justification is consent and we have a consent and the consent for this vendor is true, then start tracking
				if(typeof this.sConsentId !== "undefined" && this.sConsentId !== false && bBarShow===false && this.aStorage[sVendorId] === true)
				{							
					bTrack = true;
					break;
				}
			}
			else if(this.oLocalConfData.bModeStartInitTrackOnJustificationOther === true)
			{
				//if the justification is different to consent and in the config is set START ON JUSTIFICATION OTHER is true, then we start tracking.
				bTrack = true;
				break;				
			}
			else if(typeof this.sConsentId !== "undefined" && this.sConsentId !== false && bBarShow===false)
			{
				//if the justification is different to consent and we have allreade a consent, and the bar is not showen, then we start tracking.
				bTrack = true;
				break;				
			}
		}		
		
		if(bTrack === true && this.bStartTrack !== true)
		{
			this.setEvent("minimal-consent-given");			
		}
		else if(bTrack === false && this.bStartTrack !== false)
		{
			this.setEvent("no-consent-given");						
		}
		
		this.bStartTrack = bTrack;
	}
	
	
	
	/**
	* Organize the inital status of each vendor.
	*/
	this.init_consentStatus = function ()
	{
		if (this.sConsentId === false)
		{
			//Noch kein Storage gesetzt, daher aus Config initial setzen.
			var aStorage = {};
		}
		else
		{
			var aStorage = this.aStorage;				
		}
		
		this.bNewVendorConsent = false;
		this.bWriteStorage = false;
		
		//Iterate all vendors from the config.
		var bNoConsentJustification = false;
		for (var sVendorId in this.oLocalConfData.vendors)
		{
			var oVendorConfig = this.oLocalConfData.vendors[ sVendorId ];
			
			if(typeof aStorage[sVendorId] === "undefined")
			{
				//We do not have a stored consent of this vendor				
				if(oVendorConfig.justification.id === "consent")
				{
					//If the justification is consent, we have to wait for the consent.
					aStorage[sVendorId] = false;							
					
					//Now we have to know that there is a need for a new consent.
					this.bNewVendorConsent = true;
				}
				else
				{
					//if the justification is NOT consent, we can start to track.
					aStorage[sVendorId] = true;														
					bNoConsentJustification = true;
				}						
				
				this.bWriteStorage = true;

			}

		}
		
		
		//Check if * vendor and specific vendors are part of sStorage. If so: delete the * vendor
		if(Object.keys(aStorage).length > 1 && typeof aStorage["*"] !== "undefined")
		{
			delete aStorage["*"];
			this.bWriteStorage = true;
		}
		
		
		//Initial we have to write the storage situation, because at init no change event should fired.
		this.aInitStorage = this.copyObject(aStorage);						
		
		
		
		var bSendConsent = false;
		var bFromUser = false;
		//If there is a consent storage (consentid exists) and we never send the consent before, now we have to send it.
		if(this.bSend === false && this.sConsentId !== false)
		{
			bSendConsent = true;
			bFromUser = true;
		}
		
		//If we never send the consent before AND there was at least one vendor with a justification not Consent AND in the config we want to start tracking initial
		//when a no consent vendor was configured.
		if(this.bSend === false && bNoConsentJustification === true && this.oLocalConfData.bModeStartInitTrackOnJustificationOther === true)
		{
			bSendConsent = true;
			bFromUser = false;			
		}

		if(this.bWriteStorage)
		{
			this.writeStorage(aStorage,bSendConsent,true,false,bFromUser);
		}		
		else if(bSendConsent)
		{
			//If there is a consent storage (consentid exists) and we never send the consent before, now we have to send it.
			//If we have to send it even without a change, we must go to writeStorage.
			this.writeStorage(aStorage,bSendConsent,false,false,bFromUser);
		}		
		
		window.jentis.consent.engine.setEvent("init");
		
	}

	/**
	* Check if the consentbar should shown to the user or not.
	*
	*@return bool true if the consentbar should be showen, false if nothing should be showen to the user.
	*/
	this.checkifBarShow = function ()
	{
		if (Object.keys(this.aStorage).length === 0 || this.sConsentId === false)
		{
			//No consent is stored
			this.setEvent("show-bar");
			return true;
		}
		else
		{
			if(this.bUserConsent === false)
			{
				//The given consent was not set by the user, so show the consentbar again.
				this.setEvent("show-bar");
				return true;								
			}
			
			if(this.bNewVendorConsent === true)
			{
				//At least one new tool is added to the vendor consent list, so ask for consent again.
				this.setEvent("show-bar");
				return true;				
			}
			
			if (this.iLastUpdate === false || ( typeof this.oLocalConfData.timeoutBarShow !== "undefined" && this.oLocalConfData.timeoutBarShow !== false && this.iLastUpdate + this.oLocalConfData.timeoutBarShow < Date.now() ) )
			{
				//Max Time of consent storage is over, so we have to ask again.
				this.setEvent("show-bar");
				return true;

			}
			else
			{
				//No timeout and no new consent based vendor, so do not show the consentbar.
				return false;
			}
		}
	}


	/**
	* Read the storage from the localStorage and write it to the variables.
	*
	*/
	this.readStorage = function ()
	{
		//Get the data from the local storage.
		if(window.jentis.consent.engine.bIsLocalStorageAvailable === true)
		{
			var aData = JSON.parse(localStorage.getItem("jentis.consent.data"));
		}
		else
		{
			var aData = null;
		}

		if (aData === null)
		{
			//If not consent is stored.			
			this.sConsentId = false;
			this.iLastUpdate = false;
			this.bSend = false;
			
			//Now we want to set the initial consent to false is the justification is consent, if we have an otherwise
			//justification then consent then the inital status is true.
			this.aStorage = {};			
			for (var sVendorId in this.oLocalConfData.vendors)
			{
				var oVendorData = this.oLocalConfData.vendors[sVendorId];
				if(oVendorData.justification.id === "consent")
				{
					this.aStorage[sVendorId] = false;							
				}
				else
				{
					this.aStorage[sVendorId] = true;											
				}
			}
			
			//Set the initial storage to empty object to realize the different when we want to store the status.
			this.aInitStorage = {};
		}
		else
		{
			this.sConsentId = aData.consentid;
			this.iLastUpdate = aData.lastupdate;
			this.aStorage = aData.vendors;
			this.bUserConsent = aData.userconsent;
			
			//Backwards compatible
			if(	typeof this.aStorage === "undefined" && 
				typeof this.oLocalConfData.backward !== "undefined" && 
				typeof this.oLocalConfData.backward.vendorduplicate !== "undefined"				
			)
			{
				this.aStorage = aData[this.oLocalConfData.backward.vendorduplicate];
			}
			
			this.aInitStorage = this.copyObject(aData.vendors);
			
			//If there is a storage previously by migration not set by JENTIS Consent Engine, then the send variables
			//is not existing. Then we want to send the consent again to the JENTIS Server.
			if(typeof aData.send !== "undefined")
			{
				this.bSend = aData.send;
			}
			else
			{
				this.bSend = false;
			}
			
		}
		
	}


	
	
	//*************************
	//*************************
	//PUBLIC GET FUNCTION
	//*************************
	//*************************


	/**
	* Returns the configuration for the used consent bar template
	*
	*@return object The config Object.
	*/
	this.getTemplateConfig= function()
	{
		if(typeof this.oLocalConfData.template !== "undefined" && typeof this.oLocalConfData.template.config !== "undefined")
		{
			return this.oLocalConfData.template.config;
		}
		else
		{
			return false;			
		}
	}


	/**
	* Returns the consent status of a passed vendor
	*
	*@param string sVendorId The Id of the vendor which status you want to know.
	*@return bool Consent Status of the vendor.
	*/
	this.getVendorConsent= function(sVendorId)
	{
		return this.aStorage[sVendorId];
	}
	
	/**
	* Return Consent Status of all vendors.
	*
	*@return object Returns an object with all vendors as keys and per vendor true or fals whether the consent is set or not.
	*/
	this.getAllConsents= function()
	{
		return this.aStorage;		
	}
	
	/**
	* Return the current consentid
	*
	*@return string The current ConsentId or false if no one was created so far.
	*/
	this.getConsentId= function()
	{
		return this.sConsentId;
	}
	
	/**
	* Returns the full data of the vendors from the config.
	*
	*@return object The VendorIds as keys and an object with data about the vendor per vendorId
	*/
	this.getVendorFullData= function()
	{
		var oVendors = {};
		for(var sVendorId in this.oLocalConfData.vendors)
		{
			oVendors[sVendorId] = this.oLocalConfData.vendors[sVendorId];
			oVendors[sVendorId].status = this.aStorage[sVendorId];
		}
		
		return oVendors;
	}
	
	/**
	* Returns the Unix Timestamp in microseconds of the last update of the user.
	*
	*@return integer The last Update Time in Unix Timestamp microseconds.
	*/
	this.getLastUpdateTime = function()
	{
		return this.iLastUpdate;
	}




	


	//*************************
	//*************************
	//PUBLIC SET FUNCTION
	//*************************
	//*************************

	/**
	* Set new status of vendors.
	*
	*@param array aVendorConsents The new status auf the vendors. The vendorId is the key and the value is bool true or false.
	*/
	this.setNewVendorConsents = function (aVendorConsents)
	{
		//We want to override those vendors which are defined by the parameter.
		for(var sVendorId in aVendorConsents)
		{
			this.aStorage[sVendorId] = aVendorConsents[sVendorId];
		}
		
		//Now set the new storage to the localstorage
		return this.writeStorage(this.aStorage,true);		
	}

	/**
	* Denies all consents of all vendors.
	*/
	this.DenyAll = function ()
	{

		//Set all vendors to false if justification is consent, otherwise it must be set to true
		var aStorage = {};
		for (var sVendorId in this.oLocalConfData.vendors)
		{
			var oVendorData = this.oLocalConfData.vendors[sVendorId];
			
			if(oVendorData.justification.id === "consent" || oVendorData.deniable === true)
			{
				aStorage[sVendorId] = false;							
			}
			else
			{
				aStorage[sVendorId] = true;											
			}

		}

		//Now set the new storage to the localstorage
		return this.writeStorage(aStorage,true);		
	}

	/**
	* All vendors get a positiv consent.
	*/
	this.AcceptAll = function ()
	{
		//Set all vendors to true
		var aStorage = {};
		for (var sVendorId in this.oLocalConfData.vendors)
		{
			aStorage[sVendorId] = true;			
		}

		//Now set the new storage to the localstorage
		return this.writeStorage(aStorage,true);		
	}

	/**
	* The user requestst to get the setting panel in order to change is settings.
	*/
	this.userShowSettings = function ()
	{
		//Just throw the event so others can show the setting panel.
		this.setEvent("user-show-settings");
	}


	//*************************
	//*************************
	//INTERNAL EVENT  FUNCTION
	//*************************
	//*************************


	/**
	* External can register their event with this function. If they missed the events, we can call their callback immidiatly.
	*
	*@param string sName The name of the event to register.
	*@param function cb The callback which should be called when the event is called.
	*/
	this.addEventListener = function (sName,cb)
	{
		if(typeof this.aEventCache[sName] !== "undefined")
		{
			for(var i=0;i < this.aEventCache[sName].length; i++)
			{
				cb({"detail":this.aEventCache[sName][i]});
			}			
		}

		document.addEventListener(sName, function (e) 
		{
			cb(e);			
		});		
	}

	/**
	*DEPRECATED: Starts listen to different events
	*
	*@deprecated No longer events are used, but still supported in order to be backwars compatible. 
	*/
	this.init_eventlistener = function ()
	{
		//Trigger for external to set vendors consents.
		(function (oMe)
		{
			document.addEventListener('jentis.consent.engine.setNewVendorConsents', function (e)
			{
				oMe.setNewVendorConsents(e.details.vendors);
				oMe.setEvent("external-NewVendorData");
				

			}, false);

		})(this);


		//Trigger for external to deny all.
		(function (oMe)
		{
			document.addEventListener('jentis.consent.engine.DenyAll', function (e)
			{
				oMe.alldeny();
				oMe.setEvent("external-DenyAll");

			}, false);

		})(this);

		//Trigger for external to accept all.
		(function (oMe)
		{
			document.addEventListener('jentis.consent.engine.AcceptAll', function (e)
			{
				oMe.allagree();
				oMe.setEvent("external-AcceptAll");

			}, false);

		})(this);


	}


	/**
	* Set a event, store is to the event cache and triggers a global event.
	*
	*@param string sName The name of the event
	*@param object oValue An object of additional data which should be passed with the event.
	*
	*/
	this.setEvent = function (sName, oValue)
	{
		//Create the eventname
		var eventname = "jentis.consent.engine." + sName;
		
		//Fallback if no value is passed
		if(typeof oValue === "undefined")
		{
			var oValue = null;
		}

		//Now store the event to the event cache.
		if(typeof this.aEventCache[eventname] === "undefined")
		{
			this.aEventCache[eventname] = [];
		}		
		this.aEventCache[eventname].push(oValue);

		//Trigger the global event.
		if (typeof window.CustomEvent === 'function') 
		{
			var oEvent = new CustomEvent(eventname, {"detail": oValue});
		} 
		else 
		{
			var oEvent = document.createEvent('CustomEvent');
			oEvent.initCustomEvent(eventname, true, false, oValue);
		}

		// Dispatch the render event
		document.dispatchEvent(oEvent);		
		
	}

	//*************************
	//*************************
	//INTERNAL BASIC FUNCTIONS
	//*************************
	//*************************

	/** 
	* Check ob sich am Storage etwas geändert hat
	*
	*@param object oData2Check The vendor consent data to be checked against the local storage.
	*@return bool If true, something has changed, if false nothing has changed.
	*/
	this.checkStorageChange = function (oData2Check)
	{

		var aPosChange = [];
		var aPosNegChange = {};
		var bChange = false;
		
		for (var sKey in oData2Check)
		{
			if (typeof this.aInitStorage[sKey] === "undefined")
			{
				//A consent based vendor was added so it is a change.
				aPosChange.push(sKey);
			}
			else
			{
				if (oData2Check[sKey] === true && this.aInitStorage[sKey] === false)
				{
					//This Consent was added
					aPosChange.push(sKey);
					aPosNegChange[sKey] = true;
					bChange = true;
				}
				else if (oData2Check[sKey] === false && this.aInitStorage[sKey] === true)
				{
					//This Consent was deleted
					bChange = true;
					aPosNegChange[sKey] = false;
				}
			}
		}

		if (aPosChange.length > 0)
		{
			//There are positive consent changes, now send the event
			this.setEvent("vendor-add",aPosChange);

		}

		if(bChange === true)
		{
			//There are consent changes, so now send the regarding event.
			this.setEvent("vendor-change",oData2Check);			
		}


	
		//Now we are ready with the comparison, so prepare for the next comparison		
		this.aInitStorage = this.copyObject(oData2Check);
		return aPosNegChange;

	}

	/**
	* Writes the current vendor consent data to the local storage and optional send it to the JENTIS Tracker
	*
	*@param array aStorage The current vendor consent data to store.
	*@param bool bSend If true we will send the current consent data to the JENTIS Tracker
	*@param bool bRenewTimestamp If true we will create a new current timestamp and add it to the storage data
	*@param bool bstartTrack If true we will check if we must start tracking.	
	*/
	this.writeStorage = function (aStorage,bSend,bRenewTimestamp,bStartTracking,bFromUser)
	{		
		if(typeof bFromUser === "undefined")
		{
			bFromUser = true;
		}
		this.bUserConsent = bFromUser;
	
		//We just want to set a consentId if we are sending it to the server.
		if(this.sConsentId === false && bSend === true)
		{
			this.sConsentId = this.uuidv4();
		}			
		
		//If bSend not passed, then allways send it.
		if(typeof bSend === "undefined")
		{
			bSend = true;
		}

		//If bStartTracking not passed, then allways start Tracking
		if(typeof bStartTracking === "undefined")
		{
			bStartTracking = true;
		}

		//We are storing the update time no matter if we are sending or not.
		if(typeof bRenewTimestamp === "undefined" || bRenewTimestamp === true)
		{
			this.iLastUpdate = Date.now();
		}
		
		//Create the data to store
		var aData = {
			consentid: this.sConsentId,
			lastupdate: this.iLastUpdate,
			vendors: aStorage,			
			send: bSend,
			userconsent: bFromUser
		};			
		
		//Backwards compatible
		if(	
			typeof this.oLocalConfData.backward !== "undefined" && 
			typeof this.oLocalConfData.backward.vendorduplicate !== "undefined"				
		)
		{
			aData[this.oLocalConfData.backward.vendorduplicate] = aStorage;
		}		

		//Now write it to the local storage
		if(window.jentis.consent.engine.bIsLocalStorageAvailable === true)
		{		
			localStorage.setItem("jentis.consent.data", JSON.stringify(aData));
		}	
		
		//We want to have the new storage data even in the object storage variables
		this.aStorage = aStorage;			
		
		//Check if something had changed so we can trigger the events.
		var oVendorsChanged = this.checkStorageChange(aStorage);
		aData["vendorsChanged"] = oVendorsChanged;
		
		//Now we want to send it if wanted
		if(bSend === true)
		{
			this.setEvent("send-consent-data",aData);	
			//We can only set it to true. If send not wanted, may it is allready send to bSend is correctly mayba true.
			this.bSend = true;
		}

		
		//Now we want to check if we want to start to track.
		if(bStartTracking === true)
		{
			this.startJentisTracking(false);
		}
		
		//Return the consentID
		return this.sConsentId;
	}	
	
	
	/**
	* Return a GUID in Version 4
	*
	*@return string The GUID String in Version 4
	*
	*/
	this.uuidv4 = function () 
	{
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) 
		{
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}
	
	/**
	* Copy a object not by reference
	*
	*@param object oObj The object which must be copied.
	*@return string The new copy of the object.
	*
	*/	
	this.copyObject = function(oObj)
	{
		var oNewObj = {};
		for(var sKey in oObj)
		{
			oNewObj[sKey] = oObj[sKey];
		}
		return oNewObj;
	}
	
	

};

//We have to set the init event external because the object jentis.consent.engine must be created at this time so
//others can access the object within the event call.
window.jentis.consent.engine.init();

