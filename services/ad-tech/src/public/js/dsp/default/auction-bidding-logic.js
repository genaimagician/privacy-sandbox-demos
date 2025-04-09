/*
 Copyright 2022 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * Where is this script used:
 *   This is the 'default' auction bidding logic for a DSP.
 *
 * What does this script do?
 *   This script is used by interest groups to generate bids and report on
 *   participation in Protected Audience auctions.
 */

// ********************************************************
// Helper Functions
// ********************************************************
CURR_HOST = '';
AUCTION_ID = '';
FALLBACK_ITEM_ID = '1f937';
//One hour display limit -> TODO: change it to 1 min for demo purpose
const ONE_HOUR_MS = 3600000;
const MAX_IMPRESSIONS_PER_HOUR_PER_AD = 1;

//Seven hour display limit -> TODO: change it to 2 min for demo purpose
const SEVEN_HOURS_MS = 7 * ONE_HOUR_MS;
const MAX_IMPRESSIONS_PER_SEVEN_HOURS_PER_AD = 2;

function shouldShowAd(prevWinsMs, currentAd) { // currentAd is the ad we're considering showing
  if (!prevWinsMs || !currentAd) {
      return true; // No previous wins or no current ad, so show the ad
  }

  const recentWinsForCurrentAdOneHour = prevWinsMs.filter(([timeDeltaMs, ad]) => {
      return timeDeltaMs <= ONE_HOUR_MS && ad.renderURL === currentAd.renderURL; // Filter by time and ad renderURL
  });

  const recentWinsForCurrentAdSevenHours = prevWinsMs.filter(([timeDeltaMs, ad]) => {
      return timeDeltaMs <= SEVEN_HOURS_MS && ad.renderURL === currentAd.renderURL;
  });

  return recentWinsForCurrentAdOneHour.length < MAX_IMPRESSIONS_PER_HOUR_PER_AD &&
         recentWinsForCurrentAdSevenHours.length < MAX_IMPRESSIONS_PER_SEVEN_HOURS_PER_AD;
}


/** Logs to console. */
function log(message, context) {
  console.log(
    '[PSDemo] Buyer',
    CURR_HOST,
    'bidding logic',
    AUCTION_ID,
    message,
    JSON.stringify({context}, ' ', ' '),
  );
}

/** Logs execution context for demonstrative purposes. */
function logContextForDemo(message, context) {
  const {
    interestGroup,
    auctionSignals,
    perBuyerSignals,
    // UNUSED trustedBiddingSignals,
    // UNUSED browserSignals,
    sellerSignals,
  } = context;
  AUCTION_ID = auctionSignals.auctionId;
  if (interestGroup) {
    CURR_HOST = interestGroup.owner.substring('https://'.length);
  } else if (perBuyerSignals && perBuyerSignals.buyerHost) {
    CURR_HOST = perBuyerSignals.buyerHost;
  } else if (sellerSignals && sellerSignals.buyer) {
    CURR_HOST = sellerSignals.buyer.substring('https://'.length);
  }
  log(message, context);
}

/** Checks whether the current ad campaign is active. */
function isCurrentCampaignActive(biddingContext) {
  const {
    // UNUSED interestGroup,
    // UNUSED auctionSignals,
    // UNUSED perBuyerSignals,
    trustedBiddingSignals,
    browserSignals,
  } = biddingContext;
  if ('true' !== trustedBiddingSignals['isActive']) {
    // Don't place a bid if campaign is inactive.
    log('not bidding since campaign is inactive', {
      trustedBiddingSignals,
      seller: browserSignals.seller,
      topLevelSeller: browserSignals.topLevelSeller,
      dataVersion: browserSignals.dataVersion,
    });
    return false;
  }
  return true;
}

/** Calculates a bid price based on real-time signals. */
function calculateBidAmount(trustedBiddingSignals, dealId) {
  const minBid = Number(trustedBiddingSignals.minBid) || 0.5;
  const maxBid = Number(trustedBiddingSignals.maxBid) || 1.5;
  let multiplier = 1.0;
  if (dealId) {
    // If an eligible deal is found, use the corresponding bid multiplier.
    multiplier = Number(trustedBiddingSignals[`multiplier-${dealId}`]) || 0.5;
  } else {
    multiplier = Number(trustedBiddingSignals.multiplier) || 1.0;
  }
  let bid = Math.random() * (maxBid - minBid) + minBid;
  bid = (bid * multiplier).toFixed(2);
  log('calculated bid price', {bid, minBid, maxBid, multiplier});
  return bid;
}

/** Selects a deal ID from selectable buyer and seller reporting IDs. */
function selectDealId(selectedAd, auctionSignals) {
  const {
    buyerReportingId,
    buyerAndSellerReportingId,
    selectableBuyerAndSellerReportingIds,
  } = selectedAd;
  if (
    !selectableBuyerAndSellerReportingIds ||
    !selectableBuyerAndSellerReportingIds.length
  ) {
    // No deal IDs in interest group to choose from.
    return;
  }
  // Filter deals in interest group with deals from bid request.
  const eligibleDeals = ((dealsQuery) => {
    const availableDeals = dealsQuery?.split(',');
    if (availableDeals && availableDeals.length) {
      return selectableBuyerAndSellerReportingIds.filter((id) =>
        auctionSignals.availableDeals.includes(id),
      );
    }
  })(auctionSignals.availableDeals);
  if (!eligibleDeals || !eligibleDeals.length) {
    // No eligible deals for this bid request.
    return;
  }
  // Choose one of the eligible deals at random.
  const countOfEligibleIds = eligibleDeals.length;
  const randomIndex = Math.floor(Math.random() * countOfEligibleIds);
  const selectedId = eligibleDeals[randomIndex];
  // Log reporting IDs to console.
  log('found reporting IDs', {
    buyerReportingId,
    buyerAndSellerReportingId,
    selectableBuyerAndSellerReportingIds,
    selectedId,
  });
  return selectedId;
}

/** Returns the bid response for a video ad request. */
function getBidForVideoAd({
  interestGroup,
  auctionSignals,
  // UNUSED perBuyerSignals,
  trustedBiddingSignals,
  browserSignals,
}) {
  const {ads} = interestGroup;
  // Select an ad meeting the auction requirements.
  const [selectedAd] = ads.filter((ad) => 'VIDEO' === ad.metadata.adType);

  if (!selectedAd) {
    log('didnt find eligible video ad in IG', {interestGroup, browserSignals});
    return {bid: '0.0'};
  } 
  // Check if any deals are eligible.
  const dealId = selectDealId(selectedAd, auctionSignals);
  return {
    ad: {
      ...selectedAd.metadata,
      seller: browserSignals.seller,
      topLevelSeller: browserSignals.topLevelSeller,
    },
    bid: calculateBidAmount(trustedBiddingSignals, dealId),
    bidCurrency: 'USD',
    allowComponentAuction: true,
    render: selectedAd.renderURL,
    // Specify selected deal ID for reporting.
    selectedBuyerAndSellerReportingId: dealId,
    /*
      TODO: Use-case: Ad cost reporting
      adCost: optionalAdCost,
    */
    /*
      TODO: Use-case: Modeling signals
      modelingSignals: 123,
    */
  };
}

/** Returns the bid response for a display ad request. */
function getBidForDisplayAd({
  interestGroup,
  auctionSignals,
  // UNUSED perBuyerSignals,
  trustedBiddingSignals,
  browserSignals,
}) {
  // Select an ad meeting the auction requirements.
  const [selectedAd] = interestGroup.ads.filter(
    (ad) => 'DISPLAY' === ad.metadata.adType,
  );

  //mock data to test shouldShowAd's function
  browserSignals.prevWinsMs = [
    [30 * 60 * 1000, { renderURL: "https://privacy-sandbox-demos-dsp-b.dev/ads/display-ads?advertiser=privacy-sandbox-demos-shop.dev", metadata: { campaignId: "campaign1" } }] // 30 mins ago
  ];

  if (!selectedAd) {
    log("can't select display ad, no matching ad type found", {interestGroup});
    return {bid: '0.0'};
  } else if (!shouldShowAd(browserSignals.prevWinsMs, selectedAd)) {
    //log('frequency capping', {interestGroup, browserSignals});
    //return {bid: '0.0'};
    log('Frequency capping hit, switching to fallback ad', { interestGroup, browserSignals, fallbackItemId: FALLBACK_ITEM_ID });
    // Instead of returning {bid: 0}, set the newItemId to the fallback
    newItemId = FALLBACK_ITEM_ID;
  }
  // Check if any deals are eligible.
  const dealId = selectDealId(selectedAd, auctionSignals);

  let finalRenderUrl = selectedAd.renderURL; // Start with the original URL

  // Modify the URL if newItemId was set (either by fallback or other logic)
  if (newItemId) {
    try {
      const urlObject = new URL(selectedAd.renderURL);
      urlObject.searchParams.set('itemId', newItemId); // Set/replace itemId
      finalRenderUrl = urlObject.toString();
      log('Modified renderURL with new itemId', { oldUrl: selectedAd.renderURL, newUrl: finalRenderUrl, newItemId });
    } catch (e) {
      log('Error modifying renderURL', { error: e, originalUrl: selectedAd.renderURL });
      // Decide fallback behavior: keep original URL or potentially return 0 bid if modification is critical
      // Keeping original URL for now:
      finalRenderUrl = selectedAd.renderURL;
    }
  }

  return {
    ad: {
      ...selectedAd.metadata,
      seller: browserSignals.seller,
      topLevelSeller: browserSignals.topLevelSeller,
    },
    bid: calculateBidAmount(trustedBiddingSignals, dealId),
    bidCurrency: 'USD',
    allowComponentAuction: true,
    render: {
      url: finalRenderUrl,
      // Specify ad size for macro replacements.
      width: selectedAd.metadata.adSizes[0].width,
      height: selectedAd.metadata.adSizes[0].height,
    },
    // Specify selected deal ID for reporting.
    selectedBuyerAndSellerReportingId: dealId,
    /*
      TODO: Use-case: Ad cost reporting
      adCost: optionalAdCost,
    */
    /*
      TODO: Use-case: Modeling signals
      modelingSignals: 123,
    */
  };
}

function getBidForMultipieceAd({
  interestGroup,
  auctionSignals,
  // UNUSED perBuyerSignals,
  trustedBiddingSignals,
  browserSignals,
}) {
  // Select an ad meeting the auction requirements.
  const [selectedAd] = interestGroup.ads.filter(
    (ad) => 'MULTIPIECE' === ad.metadata.adType,
  );
  if (!selectedAd) {
    log("can't select multi-piece ad, no matching ad type found", {
      interestGroup,
    });
    return {bid: '0.0'};
  }
  // Check if any deals are eligible.
  const dealId = selectDealId(selectedAd, auctionSignals);

  //get adComponents from InterstGroup
  const {adComponents} = interestGroup;

  return {
    ad: {
      ...selectedAd.metadata,
      seller: browserSignals.seller,
      topLevelSeller: browserSignals.topLevelSeller,
    },
    bid: calculateBidAmount(trustedBiddingSignals, dealId),
    bidCurrency: 'USD',
    allowComponentAuction: true,
    render: {
      url: selectedAd.renderURL,
      // Specify ad size for macro replacements.
      width: selectedAd.metadata.adSizes[0].width,
      height: selectedAd.metadata.adSizes[0].height,
    },
    // Specify selected deal ID for reporting.
    selectedBuyerAndSellerReportingId: dealId,

    // Use-case: Ad components
    adComponents: adComponents.map(({renderUrl, widht, height}) => ({
      url: renderUrl,
      width: widht,
      height: height,
    })),
    targetNumAdComponents: 5,
    numMandatoryAdComponents: 1,
  };
}

function getBidByAdType(adType, biddingContext) {
  switch (adType) {
    case 'VIDEO':
      return getBidForVideoAd(biddingContext);
    case 'MULTIPIECE':
      return getBidForMultipieceAd(biddingContext);
  }

  //DISPLAY
  return getBidForDisplayAd(biddingContext);
}

// ********************************************************
// Top-level Protected Audience functions
// ********************************************************
function generateBid(
  interestGroup,
  auctionSignals,
  perBuyerSignals,
  trustedBiddingSignals,
  browserSignals,
) {
  const biddingContext = {
    interestGroup,
    auctionSignals,
    perBuyerSignals,
    trustedBiddingSignals,
    browserSignals,
  };
  logContextForDemo('generateBid()', biddingContext);

  if (!isCurrentCampaignActive(biddingContext)) {
    log('not bidding as campaign is inactive', biddingContext);
    return;
  }
  const bid = getBidByAdType(auctionSignals.adType, biddingContext);
  if (bid) {
    log('returning bid', {bid, biddingContext});
    return bid;
  } else {
    log('not bidding', {biddingContext});
  }
}

function reportWin(
  auctionSignals,
  perBuyerSignals,
  sellerSignals,
  browserSignals,
) {
  logContextForDemo('reportWin()', {
    auctionSignals,
    perBuyerSignals,
    sellerSignals,
    browserSignals,
  });
  // Assemble query parameters for event logs.
  let additionalQueryParams = browserSignals.renderURL.substring(
    browserSignals.renderURL.indexOf('?') + 1,
  );
  const reportingContext = {
    auctionId: AUCTION_ID,
    pageURL: auctionSignals.pageURL,
    componentSeller: browserSignals.seller,
    topLevelSeller: browserSignals.topLevelSeller,
    renderURL: browserSignals.renderURL,
    bid: browserSignals.bid,
    bidCurrency: browserSignals.bidCurrency,
    buyerReportingId: browserSignals.buyerReportingId,
    buyerAndSellerReportingId: browserSignals.buyerAndSellerReportingId,
    prevWinsMs: browserSignals.prevWinsMs,
    selectedBuyerAndSellerReportingId:
      browserSignals.selectedBuyerAndSellerReportingId,
  };
  for (const [key, value] of Object.entries(reportingContext)) {
    additionalQueryParams = additionalQueryParams.concat(`&${key}=${value}`);
  }
  sendReportTo(
    browserSignals.interestGroupOwner +
      `/reporting?report=win&${additionalQueryParams}`,
  );
  // Disable redirect chain temporarily to make ARA debugging easier.
  // additionalQueryParams = additionalQueryParams.concat(
  //   `&redirect=${browserSignals.seller}`,
  // );
  registerAdBeacon({
    'impression': `${browserSignals.interestGroupOwner}/reporting?report=impression&${additionalQueryParams}`,
    'reserved.top_navigation_start': `${browserSignals.interestGroupOwner}/reporting?report=top_navigation_start&${additionalQueryParams}`,
    'reserved.top_navigation_commit': `${browserSignals.interestGroupOwner}/reporting?report=top_navigation_commit&${additionalQueryParams}`,
  });
}
