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

export const {
  // Runtime variables
  PORT,
  EXTERNAL_PORT,
  HOSTNAME,

  // Advertisers
  SHOP_HOST,
  SHOP_DETAIL,
  TRAVEL_HOST,
  TRAVEL_DETAIL,

  // Publishers
  NEWS_HOST,
  NEWS_DETAIL,
  TOPICS_MOTO_HOST,
  TOPICS_SOCCER_HOST,
  TOPICS_GRADENING_HOST,

  // Ad-techs
  DSP_HOST,
  DSP_DETAIL,

  DSP_A_HOST,
  DSP_A_DETAIL,

  DSP_B_HOST,
  DSP_B_DETAIL,

  SSP_HOST,
  SSP_DETAIL,

  SSP_A_HOST,
  SSP_A_DETAIL,

  SSP_B_HOST,
  SSP_B_DETAIL,

  AD_SERVER_HOST,
} = process.env;

export const DSP_ORIGIN = new URL(
  `https://${DSP_HOST}:${EXTERNAL_PORT}`,
).toString();
export const DSP_A_ORIGIN = new URL(
  `https://${DSP_A_HOST}:${EXTERNAL_PORT}`,
).toString();
export const DSP_B_ORIGIN = new URL(
  `https://${DSP_B_HOST}:${EXTERNAL_PORT}`,
).toString();

/** Shop item labels indexed by their ID. */
export const KNOWN_SHOP_ITEM_LABELS_BY_ID = {
  '1f45e': "Man's brown shoe",
  '1f45f': 'Blue running shoe',
  '1f460': 'Red high-heeled shoe',
  '1f461': "Woman's sandal",
  '1f462': "Woman's boot",
  '1f6fc': 'Roller skate',
  '1f97e': 'Hiking boot',
  '1f97f': 'Blue flat shoe',
  '1fa70': 'Ballet shoes',
  '1fa74': 'Thong sandal',
  '1f3bf': 'Ski boots',
  '26f8': 'Ice skate',
};
