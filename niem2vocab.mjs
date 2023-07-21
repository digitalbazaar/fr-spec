
import libxmljs from "libxmljs";
import {createWriteStream, readFileSync} from 'node:fs';
import {basename, dirname} from 'node:path';

const xsNamespace = {'xs': 'http://www.w3.org/2001/XMLSchema'};
const niemDirectory = dirname(process.argv[2]);
const niemFilename = basename(process.argv[2]);
const niemType = process.argv[3];

// open files for writing
const vocabStream = createWriteStream(process.cwd() + '/vocabulary.yml');
const contextStream = createWriteStream(process.cwd() + '/fs-v1.jsonld');

// load schema file
console.log('Loading schema from', niemFilename);
process.chdir(niemDirectory);
const niemFile = readFileSync(niemFilename);
const xsdModel = libxmljs.parseXml(niemFile);

// get base type
const typeModel = xsdModel.find(
  `//xs:complexType[@name="${niemType}"]`, xsNamespace)[0];
//console.log('Got model', typeModel);

const allClasses = {};
const allProperties = {};

function buildRdfClass(subModel) {
  //console.log("GASP", subModel.getAttribute('name').value());

  // add class information
  const rdfClass = {};
  rdfClass.id = subModel.getAttribute('name').value();
  rdfClass.label = rdfClass.id.match(/[A-Z][a-z]+|[0-9]+/g).join(' ');
  const comment = subModel.childNodes()[1].childNodes()[1].childNodes()[0].toString() + '.';
  rdfClass.comment = comment;
  allClasses[rdfClass.id] = rdfClass;
  //console.log("ADD CLASS", rdfClass);

  // get all properties for class
  subModel.childNodes().forEach(node => {
    //console.log('SM', node.name());
    if(node.name() === 'complexContent') {
      const elements = node.childNodes()[1].childNodes()[1].childNodes();
      elements.forEach(element => {
        if(element.name() === 'element') {
          const property = {};
          property.curie = element.getAttribute('ref').value();
          const propertyName = property.curie.split(':')[1];
          property.label = propertyName.match(/[A-Z][a-z]+|[0-9]+/g)?.join(' ');
          property.id = propertyName[0].toLowerCase() + propertyName.slice(1);
          //console.log('ELEMENT', property);
          //console.log('propertyName', propertyName);
          //console.log('ADD PROPERTY', property);
          allProperties[property.id] = property;

          const elementDefinition = subModel.find(
            `//xs:element[@name="${propertyName}"]`, xsNamespace)[0];
          if(elementDefinition) {
            //console.log('GED', elementDefinition.toString());
            const type = elementDefinition.getAttribute('type')?.value();
            //console.log('type', type);
            const comment = elementDefinition.childNodes()[1].childNodes()[1].childNodes()[0].toString() + '.';
            //console.log('COMMENT', comment);
            property.comment = comment;
            property.domain = rdfClass.id;

            if(type) {
              const namespace = type.split(':')[0];
              const bareType = type.split(':')[1];
              if(namespace === 'em') {
                property.range = bareType;
              } else {
                property.range = type;
              }
              const subTypeModel = subModel.find(
                `//xs:complexType[@name="${bareType}"]`, xsNamespace)[0];
              if(subTypeModel) {
                if(!(bareType in allClasses)) {
                  buildRdfClass(subTypeModel);
                }
              }
            }
          }
        }
      });
    }
  });
}

buildRdfClass(typeModel);

vocabStream.write(`vocab:
  - id: fr
    value: https://w3id.org/first-responder#

prefix:
  - id: aamva_d20
    value: http://release.niem.gov/niem/codes/aamva_d20/5.0/#
  - id: ag
    value: http://release.niem.gov/niem/domains/agriculture/5.2/#
  - id: ag_codes
    value: http://release.niem.gov/niem/codes/ag_codes/5.0/#
  - id: apco
    value: http://release.niem.gov/niem/codes/apco/5.0/#
  - id: atf
    value: http://release.niem.gov/niem/codes/atf/5.0/#
  - id: biom
    value: http://release.niem.gov/niem/domains/biometrics/5.2/#
  - id: bls
    value: http://release.niem.gov/niem/codes/bls/5.0/#
  - id: can
    value: http://release.niem.gov/niem/codes/canada_post/5.0/#
  - id: cbrn
    value: http://release.niem.gov/niem/domains/cbrn/5.2/#
  - id: cbrncl
    value: http://release.niem.gov/niem/codes/cbrncl/5.0/#
  - id: cli
    value: http://reference.niem.gov/niem/specification/code-lists/5.0/code-lists-instance/#
  - id: commodity
    value: http://release.niem.gov/niem/codes/commodity/5.0/#
  - id: cui
    value: http://release.niem.gov/niem/auxiliary/cui/5.1/#
  - id: cyber
    value: http://release.niem.gov/niem/domains/cyber/5.2/#
  - id: dea
    value: http://release.niem.gov/niem/codes/dea_ctlsub/5.0/#
  - id: edxl_rm
    value: http://release.niem.gov/niem/codes/edxl_rm/5.0/#
  - id: edxl-cap
    value: http://release.niem.gov/niem/adapters/edxl-cap/5.0/#
  - id: edxl-de
    value: http://release.niem.gov/niem/adapters/edxl-de/5.0/#
  - id: edxl-have
    value: http://release.niem.gov/niem/adapters/edxl-have/5.0/#
  - id: em
    value: http://release.niem.gov/niem/domains/emergencyManagement/5.2/#
  - id: fema
    value: http://release.niem.gov/niem/codes/fema/5.1/#
  - id: fips
    value: http://release.niem.gov/niem/codes/fips/5.2/#
  - id: genc
    value: http://release.niem.gov/niem/codes/genc/5.0/#
  - id: geo
    value: http://release.niem.gov/niem/adapters/geospatial/5.1/#
  - id: have-codes
    value: http://release.niem.gov/niem/codes/edxl_have/5.0/#
  - id: hazmat
    value: http://release.niem.gov/niem/codes/hazmat/5.0/#
  - id: hl7
    value: http://release.niem.gov/niem/codes/hl7/5.0/#
  - id: hs
    value: http://release.niem.gov/niem/domains/humanServices/5.2/#
  - id: im
    value: http://release.niem.gov/niem/domains/immigration/5.2/#
  - id: intel
    value: http://release.niem.gov/niem/domains/intelligence/5.2/#
  - id: ip
    value: http://release.niem.gov/niem/domains/infrastructureProtection/5.0/#
  - id: iso_3166
    value: http://release.niem.gov/niem/codes/iso_3166-1/5.0/#
  - id: iso_4217
    value: http://release.niem.gov/niem/codes/iso_4217/5.0/#
  - id: iso_639-3
    value: http://release.niem.gov/niem/codes/iso_639-3/5.1/#
  - id: iso_639-5
    value: http://release.niem.gov/niem/codes/iso_639-5/5.2/#
  - id: it
    value: http://release.niem.gov/niem/domains/internationalTrade/5.2/#
  - id: itcodes
    value: http://release.niem.gov/niem/codes/it_codes/5.0/#
  - id: j
    value: http://release.niem.gov/niem/domains/jxdm/7.2/#
  - id: jc3iedm
    value: http://release.niem.gov/niem/codes/jc3iedm/5.0/#
  - id: jp2-0
    value: http://release.niem.gov/niem/codes/jp2-0/5.0/#
  - id: jp3-52
    value: http://release.niem.gov/niem/codes/jp3-52/5.0/#
  - id: lrn-dev
    value: http://release.niem.gov/niem/domains/learn-dev/5.2/#
  - id: m
    value: http://release.niem.gov/niem/domains/maritime/5.2/#
  - id: mmucc
    value: http://release.niem.gov/niem/codes/mmucc/5.0/#
  - id: mo
    value: http://release.niem.gov/niem/domains/militaryOperations/5.2/#
  - id: nc
    value: http://release.niem.gov/niem/niem-core/5.0/#
  - id: nces
    value: http://release.niem.gov/niem/codes/nces/5.0/#
  - id: ncic
    value: http://release.niem.gov/niem/codes/ncic/5.2/#
  - id: ndex
    value: http://release.niem.gov/niem/codes/ndex/5.0/#
  - id: nga
    value: http://release.niem.gov/niem/codes/nga/5.0/#
  - id: niem-xs
    value: http://release.niem.gov/niem/proxy/niem-xs/5.0/#
  - id: nlets
    value: http://release.niem.gov/niem/codes/nlets/5.0/#
  - id: occs
    value: http://release.niem.gov/niem/codes/occs/5.0/#
  - id: opm
    value: http://release.niem.gov/niem/codes/opm/5.0/#
  - id: sar
    value: http://release.niem.gov/niem/codes/pmise_sar/5.0/#
  - id: scr
    value: http://release.niem.gov/niem/domains/screening/5.2/#
  - id: st
    value: http://release.niem.gov/niem/domains/surfaceTransportation/5.0/#
  - id: stat
    value: http://release.niem.gov/niem/auxiliary/statistics/5.0/#
  - id: stix
    value: http://release.niem.gov/niem/codes/stix/5.1/#
  - id: structures
    value: http://release.niem.gov/niem/structures/5.0/#
  - id: ucr
    value: http://release.niem.gov/niem/codes/ucr/5.1/#
  - id: unece
    value: http://release.niem.gov/niem/codes/unece_rec20/5.0/#
  - id: usda_fsa
    value: http://release.niem.gov/niem/codes/usda_fsa/5.0/#
  - id: usmtf
    value: http://release.niem.gov/niem/domains/usmtf/5.2/#
  - id: usps
    value: http://release.niem.gov/niem/codes/usps/5.0/#
  - id: xCard
    value: http://release.niem.gov/niem/codes/xCard/5.0/#
  - id: xml
    value: http://www.w3.org/XML/1998/namespace#
  - id: xs
    value: http://www.w3.org/2001/XMLSchema#

ontology:
  - property: dc:title
    value: First Responder Verifiable Credentials Specification v0.1

  - property: dc:description
    value: specification for describing First Responders using Verifiable Credentials that is compatible with NIEMOpen, a community-driven, common vocabulary that enables efficient information exchange across diverse public and private organizations. This document provides an introduction and examples for developers issuing and verifying Verifiable Credentials for use in the First Responder community

  - property: rdfs:seeAlso
    value: http://niem.github.io/
`);

vocabStream.write('\nclass:');
Object.values(allClasses).forEach(rdfClass => {
  vocabStream.write(`
  - id: ${rdfClass.id}
    label: ${rdfClass.label}
    comment: ${rdfClass.comment.replace(/\:/g, '-')}\n`);
});

vocabStream.write('\nproperty:');
Object.values(allProperties).forEach(rdfProperty => {
  vocabStream.write(`
  - id: ${rdfProperty.id}
    label: ${rdfProperty.label}\n`)

  if(rdfProperty.domain) {
    vocabStream.write(`    domain: ${rdfProperty.domain}\n`);
  }
  if(rdfProperty.range) {
    vocabStream.write(`    range: ${rdfProperty.range}\n`);
  }
  if(rdfProperty.comment) {
    vocabStream.write(`    comment: ${rdfProperty.comment.replace(/\:/g, '-')}\n`);
  } else {
    vocabStream.write(`    comment: ${rdfProperty.label}\n`);
  }
});
vocabStream.end();
