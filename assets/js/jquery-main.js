$(document).ready(async function () {

    var fileInB64 = ''
    var url = window.location.href;
    const model = await tf.loadLayersModel(`${url}assets/model/model.json`)
    $.getScript(`${url}assets/js/jquery.js`)

    function confirmBox() {

        $.MessageBox({
            buttonDone: "OK",
            buttonFail: "Back",
            message: makeMessageBox()

        }).done(async function () {

            $.LoadingOverlay("show");

            // alert('Under construction')
            var responseAPI = await requestAPI()
            setResponse(responseAPI)

            $.LoadingOverlay("hide");

        }).fail(function () { });

    }

    function loadImage(source) {

        source = "data:image/png;base64," + source

        return new Promise((resolve, reject) => {
            let img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.crossOrigin = "Anonymous";
            img.src = source
        })
    }

    function preprocessCanvas(image) {

        let tensor = tf.browser.fromPixels(image)
            .resizeNearestNeighbor([28, 28])
            .mean(2)
            .expandDims(2)
            .expandDims()
            .toFloat();

        return tensor.div(255.0);
    }


    async function runModel(image) {

        const inputTensor = preprocessCanvas(image)
        const predictionResult = model.predict(inputTensor).dataSync();
        const recognizedDigit = predictionResult.indexOf(Math.max(...predictionResult));

        return String(recognizedDigit)
    }

    async function setRA(dataRA) {

        var RA = ''

        for (var column = 1; column < 7; column++) {
            source = dataRA[column]
            imageNumber = await loadImage(source)
            RA = RA + await runModel(imageNumber)
        }
        $("#API .test").last().find("#inputRA").val(RA);
    }

    async function setAlternatives(dataAlternatives) {

        var quantTests = $('.test').length

        var message = ''
        for (var i = 1; i < 31; i++) {

            var pos = ('0' + i).slice(-2)
            var id = String(quantTests) + '_alt-' + pos
            var response = dataAlternatives[pos]

            message = message + `<div class="alt">
                                    <label for="${id}">${pos}</label>
                                    <input type="text" maxlength="1" id="${id}" value="${response}"></input>
                                </div>`
        }

        $("#API .test").last().find(".alternativesAPI").append(message);

    }

    async function setOther(other, otherResponsePredict){

        var quantAlternatives  = $('.test').first().find('.alternativesAPI > div').length
        var quantTests = $('.test').length
        
        var pos = quantAlternatives + other
        var id =  String(quantTests) + "_oth-" + String(pos)

        modelOther = `
            <div class="oth">
                <label for="${id}">${pos}</label>
                <input type='text' maxlength='6' id="${id}" value="${otherResponsePredict}"></input>
            </div>
        `
        $("#API .test").last().find(".othersAPI").append(modelOther);
    }

    async function setOthers(dataOthers) {
        
        var otherResponsePredict = ''
        
        for (var other = 1; other < 11; other++) {
            otherResponsePredict = ""

            for(var column = 1; column < 7; column++){
                source = dataOthers[other][column]
                imageNumber = await loadImage(source)
                otherResponsePredict = otherResponsePredict + await runModel(imageNumber)
            }
            await setOther(other, otherResponsePredict)
        }
    }

    async function setData(dataBody) {

        sourceb64 = "data:image/png;base64," + dataBody['bigRect']

        // $("#answersQuestions").css({ "display": "none" });
        $("#btnDownloadCsv").css({ "display": "block" });
        $("#API").css({ "display": "block" });
        // $("#imgB64").attr("src", "data:image/png;base64," + fileInB64);

        test = `
            <!-- Content Test -->
            <div class="test">
                <!-- Image -->
                <div id="imageID">
                    <div class="RA-Result">
                        <div class="idStudent">
                            <label>RA:</label>
                            <input type='text' maxlength='6' id="inputRA"></input>
                        </div>
                        <div class="resultTest">
                            <label for="aa">Result:</label>
                            <input type='text' maxlength='6' id="result" value="" readonly="readonly"></input>
                        </div>
                    </div>
                    <span>
                        <img id="imgB64" src=${sourceb64}>
                    </span>
                </div>
                <!-- Responses -->
                <div class="resultResponse">
                    <!-- Content Alternatives -->
                    <div class="alternativesAPI">
                        <h3>Alternatives:</h3>
                    </div>
                    <hr>
                    <!-- Content Others -->
                    <div class="othersAPI">
                        <h3>Others:</h3>
                    </div>
                </div>
            </div>
        `

        $('#API').append(test)

        await setRA(dataBody['imagensRA'])

        if ('alternatives' in dataBody) {
            await setAlternatives(dataBody['alternatives'])
        }

        if ('imagensOthers' in dataBody) {
            await setOthers(dataBody['imagensOthers'])
        }

        checkQuestionsToApplyCss()
    }

    function makeDataToSendAPI() {

        dataToSend = {}
        dataToSend['image'] = fileInB64
        dataToSend['numberQuestions'] = {}

        quantAlternatives = $('select[name="selectQuantAlternatives"]').val();
        quantOthers = $('select[name="selectQuantOthers"]').val();

        if (quantAlternatives != '' && quantAlternatives != '999') {
            dataToSend['numberQuestions']['alternatives'] = parseInt(quantAlternatives)
        }

        if (quantOthers != '' && quantOthers != '999') {
            dataToSend['numberQuestions']['others'] = parseInt(quantOthers)
        }

        return dataToSend
    }

    function requestAPI() {

        dataToSend = makeDataToSendAPI()

        return $.ajax({
            url: 'https://r0oq6xy9te.execute-api.us-east-2.amazonaws.com/AutoCT-API/upload',
            crossDomain: true,
            processData: false,
            data: JSON.stringify(dataToSend),
            dataType: 'json',
            contentType: 'image/png',
            type: 'POST',
            success: function (responseAPI) {
                return responseAPI
            },
            fail: function (responseAPI) {
                return responseAPI
            }
        });
    }

    $("#file").change(function () {
        $(".divFile").css({ "background-color": "#8080800d" });
        var file = document.querySelector('.divFile > input[type="file"]').files[0];
        getBase64(file)
    });

    $("body").on('input', '.alt', function () {
        var regex = /[^A-Ea-e]/gi
        var newValue = $(this).find('input').val()
        var valueRegex = newValue.replace(regex, "")
        $(this).find('input').val(valueRegex.toUpperCase())
        
        checkQuestionsToApplyCss()
    });

    function getBase64(file) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            fileInB64 = reader.result.split(',')[1];
        };
        reader.onerror = function (error) {
            console.log('Error: ', error);
        };
    }

    $("#btnCorrect").click(async function () {
        if (checkFile() == true){
            if (checkInputs() == true){
                confirmBox()
            } else{
                alert("Some input is empty!")
            }
        } else{
            alert("No file selected!")
        }
    });

    function analysesStatus(statusCode) {

        if (String(statusCode) === '200') {
            return 'true'
        }
        else {
            return 'false'
        }
    }

    function setResponse(responseAPI) {

        status = analysesStatus(responseAPI['statusCode'])
        console.log(responseAPI)

        if (status === 'true') {
            setData(responseAPI['body'])
        }
        else {
            alert("Oops, something didn't work. Please, try again.")
        }

    }

    $("#btnDownloadCsv").click(function(){
        
        let resultTestsContent = 'RA,Nota\n'
        
        $('.test').each(function(index, testElement) {
            var idStudent = $(testElement).find('#imageID').find('.RA-Result').find('.idStudent').find('input').val()
            var resultTest = $(testElement).find('#imageID').find('.RA-Result').find('.resultTest').find('input').val()
            
            resultTestsContent = resultTestsContent + idStudent + ',' + resultTest + '\n'
        })
       
        let csvContent = "data:text/csv;charset=utf-8," + resultTestsContent
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("id", "aDownload");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Results-AutoCV.csv");
        document.body.appendChild(link);
        link.click();
        link.remove()
    });
});