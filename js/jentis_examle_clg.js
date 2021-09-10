document.addEventListener('jentis.consent.engine.minimal-consent-given', function (e)
{
    console.log("Minimal Consent is given: %o",e.detail); // fixed a typo ;)
});
document.addEventListener('jentis.consent.engine.no-consent-given', function (e)
{
    console.log("No Consent is given: %o",e.detail); // does not get triggered at minimal consent
});
document.addEventListener('jentis.consent.engine.send-consent-data', function (e)
{
    console.log("SEND Consent to Server: %o",e.detail);
    UpdateLog(e.detail); // added to make some details visible on page
});
document.addEventListener('jentis.consent.engine.show-bar', function (e)
{
    console.log("Show Bar now: %o",e.detail);
});
            
document.addEventListener('jentis.consent.engine.vendor-change', function (e)
{
    console.log("Vendor Changed: %o",e.detail);
});			

document.addEventListener('jentis.consent.engine.vendor-add', function (e)
{
    console.log("Vendor Add: %o",e.detail);
});			

document.addEventListener('jentis.consent.engine.init', function (e)
{
    console.log("CMP Init: %o",e.detail);
});			