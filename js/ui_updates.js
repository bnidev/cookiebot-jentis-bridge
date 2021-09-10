
// Update UI on page load
window.onload = () => {
    updateUI();    
}


const updateUI = () => {
    // get DOM elements
    const el_consent_status = document.getElementById("consent_status");
    const el_consent_preferences = document.getElementById("consent_preferences");
    const el_consent_statistics = document.getElementById("consent_statistics");
    const el_consent_marketing = document.getElementById("consent_marketing");
    const el_consent_necessary = document.getElementById("consent_necessary");
    const el_jentis_vendors = document.getElementById("jentis_vendors");
    const el_jentis_last_updated = document.getElementById("jentis_last_updated");
    
    // reset CSS classes
    el_consent_status.classList.remove("success", "fail");
    el_consent_preferences.classList.remove("success", "fail");
    el_consent_statistics.classList.remove("success", "fail");
    el_consent_marketing.classList.remove("success", "fail");
    el_consent_necessary.classList.remove("success", "fail");
    

    if(Cookiebot.consented) {        
        el_consent_status.innerText = "accepted";
        el_consent_status.classList.add("success");
    } else {
        el_consent_status.innerText = "declined";
        el_consent_status.classList.add("fail");
    }    
    
    if(Cookiebot.consent.preferences) {        
        el_consent_preferences.innerText = "allowed";
        el_consent_preferences.classList.add("success");
    } else {       
        el_consent_preferences.innerText = "not allowed";
        el_consent_preferences.classList.add("fail");
    }
    
    if(Cookiebot.consent.statistics) {
        el_consent_statistics.innerText = "allowed";
        el_consent_statistics.classList.add("success")
    } else {
        el_consent_statistics.innerText = "not allowed";
        el_consent_statistics.classList.add("fail")
    }
    
    if(Cookiebot.consent.marketing) {
        el_consent_marketing.innerText = "allowed";
        el_consent_marketing.classList.add("success")
    } else {
        el_consent_marketing.innerText = "not allowed";
        el_consent_marketing.classList.add("fail")
    }

    if(!Cookiebot.consent.preferences && !Cookiebot.consent.marketing && !Cookiebot.consent.statistics) {
        el_consent_necessary.innerText = "yes";
        el_consent_necessary.classList.add("success");
    } else {
        el_consent_necessary.innerText = "no";
        el_consent_necessary.classList.add("fail");
    }

    // Update JENTIS UI information
    const vendors = Object.entries(jentis.consent.engine.getVendorFullData());
    const last_updated = jentis.consent.engine.getLastUpdateTime();

    let vendors_markup = "";
    vendors.map(v => {
        vendors_markup += `<p>${v[1].vendor.name} (${v[1].purpose.name}): ${v[1].status ? `<span class="success">allowed</span>` : `<span class="fail">not allowed</span>`}</p>`
    })
    el_jentis_vendors.innerHTML = vendors_markup;

    const date = new Date(last_updated).toLocaleDateString("de-DE");   
    const time = new Date(last_updated).toLocaleTimeString("de-DE");
    
    el_jentis_last_updated.innerText = `${date} ${time}`;
}


const UpdateLog = (data) => {
    const el = document.getElementById("jentis_sent_to_server");   
    el.innerText = JSON.stringify(data, null, 4);
}