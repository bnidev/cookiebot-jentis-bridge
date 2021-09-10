console.log("Consent Bridge loaded...");

window.addEventListener("CookiebotOnDialogInit", () => {
    console.log("[Cookiebot] Dialog initialized");
})

window.addEventListener("CookiebotOnDecline", () => {
    console.log("[Cookiebot] User declined consent");
    SetConsentSettingsToMinimal();
    updateUI();
})

window.addEventListener("CookiebotOnAccept", () => {
    console.log("[Cookiebot] User accepted consent");
    UpdateConsentSettings();
    updateUI();
})

// Update consent settings in JENTIS Consent Engine
const UpdateConsentSettings = () => {    
    const vendors = Object.entries(jentis.consent.engine.getVendorFullData());      
    let vendors_settings = {};
    vendors.map(v => {
        vendors_settings[`${v[0]}`] = false
        if(Cookiebot.consent.marketing && v[1].purpose.id == "mark") vendors_settings[`${v[0]}`] = true; 
        if(Cookiebot.consent.statistics && v[1].purpose.id == "stat") vendors_settings[`${v[0]}`] = true; 
        if(Cookiebot.consent.preferences && v[1].purpose.id == "pref") vendors_settings[`${v[0]}`] = true; 
    })
    jentis.consent.engine.setNewVendorConsents(vendors_settings);
}

// Set all vendor consent settings in JENTIS Consent Engine to false
const SetConsentSettingsToMinimal = () => {
    if(Cookiebot.consent.necessary) {
        const vendors = Object.entries(jentis.consent.engine.getVendorFullData());    
        let vendors_settings = {};
        vendors.map(v => {
            vendors_settings[`${v[0]}`] = false
        })
        jentis.consent.engine.setNewVendorConsents(vendors_settings);
    }    
}
