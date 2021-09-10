/**
 * The JENTIS consent GTM Bridge
 *
 * The JENTIS consent engine is the central API component 
 * on page to communicate with all other consent components.
 * 
 */
window.jentis = window.jentis || {};
window.jentis.consent = window.jentis.consent || {};

window.jentis.consent.gtm_bridge = new function ()
{
	
	this.init = function ()
	{
		this.oGTMDataLayerTrackingCache = {};
		
		if(typeof window.jentis.consent.engine !== "undefined")
		{
			//If the engine is allready loaded, we maybe missed the events, so we want to register at the engine instead of the document.
			var oEventBaseObject = window.jentis.consent.engine;			
		}
		else
		{
			//No engine allready exists, so it is safe to register at the document.
			var oEventBaseObject = document;
		}

		(function(oMe,oEventBaseObject){
			oEventBaseObject.addEventListener('jentis.consent.engine.init',function(e)
			{
				oMe.trackGTMDataLayer();
			});

			oEventBaseObject.addEventListener('jentis.consent.engine.vendor-add',function(e)
			{
				oMe.trackGTMDataLayer();
			});
		})(this,oEventBaseObject);

	}
		
	/**
	* Overhand the tracking information to the GTM DataLayer
	*
	*/
	this.trackGTMDataLayer = function()
	{
		//Create the DataLayer Object to push later with basic information
		var oLocalDataLayer = {};
		oLocalDataLayer.event = "jentis-consent-track";
		oLocalDataLayer.consentid = window.jentis.consent.engine.getConsentId();
		oLocalDataLayer.lastupdate = window.jentis.consent.engine.getLastUpdateTime();
		aVendorData = window.jentis.consent.engine.getAllConsents();
		
		//Set for each vendor the status and the tracking status to the dataLayer
		for(var sVendorId in aVendorData)
		{
			//Status is the current consent status of the vendor.
			var bStatus = aVendorData[sVendorId];
			
			//If there was allready a tracking to this vendor at this page-load, do not track again.
			
			if(bStatus === false)
			{
				//False at all so no tracking.
				var bTracking = false;								
			}
			else if(bStatus === true && this.oGTMDataLayerTrackingCache[sVendorId] === true)
			{
				//Allready tracked, so do not track again.
				var bTracking = false;				
			}
			else
			{
				//Not tracked yet, so track now and write it to the TrackingCache to remember later.
				var bTracking = true;						
				this.oGTMDataLayerTrackingCache[sVendorId] = true;				
			}
									
			//Now set the Vendor Object to the DataLayer
			oLocalDataLayer["vendor-"+sVendorId+"-track"] = bTracking;
			oLocalDataLayer["vendor-"+sVendorId+"-status"] = bStatus;			
		}
				
		//Now we want to send all information to the GTM.
		window.dataLayer = window.dataLayer || [];
		window.dataLayer.push(oLocalDataLayer);
				
	}
	
	this.init();

}

